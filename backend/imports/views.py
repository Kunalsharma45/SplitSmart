import csv
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import TextIOWrapper

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from expenses.models import Expense
from expenses.serializers import ExpenseSerializer
from groups.models import Group, get_active_members_on_date
from users.models import User

UUID_PATTERN = re.compile(r'^[0-9a-fA-F-]{36}$')


class CsvImportParseView(APIView):
    parser_classes = [MultiPartParser]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        group_id = request.data.get('group_id') or request.data.get('group')
        file = request.FILES.get('file')

        if not group_id:
            return Response({'success': False, 'data': None, 'message': 'group_id is required.', 'errors': ['group_id_required']}, status=status.HTTP_400_BAD_REQUEST)
        if not file:
            return Response({'success': False, 'data': None, 'message': 'CSV file is required.', 'errors': ['file_required']}, status=status.HTTP_400_BAD_REQUEST)

        group = get_object_or_404(Group, pk=group_id)
        if not group.members.filter(user=request.user).exists():
            return Response({'success': False, 'data': None, 'message': 'Only group members may import expenses.', 'errors': ['permission_denied']}, status=status.HTTP_403_FORBIDDEN)

        try:
            decoded = TextIOWrapper(file.file, encoding='utf-8-sig')
            reader = csv.DictReader(decoded)
        except Exception:
            return Response({'success': False, 'data': None, 'message': 'Unable to read CSV file.', 'errors': ['invalid_csv']}, status=status.HTTP_400_BAD_REQUEST)

        member_indexes = self._build_member_indexes(group)
        rows = []

        for row_number, raw_row in enumerate(reader, start=1):
            if not any(raw_row.values()):
                continue
            try:
                parsed_row = self._parse_csv_row(raw_row, group, member_indexes, row_number)
                rows.append({
                    'row_number': row_number,
                    'valid': True,
                    'errors': [],
                    'parsed_row': parsed_row,
                    'preview': {
                        'title': parsed_row.get('title'),
                        'date': parsed_row.get('date'),
                        'amount': parsed_row.get('amount'),
                        'currency': parsed_row.get('currency'),
                        'paid_by_id': parsed_row.get('paid_by_id'),
                        'split_type': parsed_row.get('split_type'),
                    },
                })
            except ValidationError as exc:
                detail = exc.detail if hasattr(exc, 'detail') else str(exc)
                errors = []
                if isinstance(detail, dict):
                    for value in detail.values():
                        if isinstance(value, (list, tuple)):
                            errors.extend([str(v) for v in value])
                        else:
                            errors.append(str(value))
                elif isinstance(detail, (list, tuple)):
                    errors.extend([str(v) for v in detail])
                else:
                    errors.append(str(detail))
                rows.append({
                    'row_number': row_number,
                    'valid': False,
                    'errors': errors,
                    'parsed_row': None,
                    'preview': {
                        'title': raw_row.get('title'),
                        'date': raw_row.get('date'),
                        'amount': raw_row.get('amount'),
                        'currency': raw_row.get('currency'),
                        'paid_by': raw_row.get('paid_by'),
                        'split_type': raw_row.get('split_type'),
                    },
                })

        return Response({
            'success': True,
            'data': {
                'rows': rows,
                'summary': {
                    'total_rows': len(rows),
                    'valid_rows': sum(1 for r in rows if r['valid']),
                    'invalid_rows': sum(1 for r in rows if not r['valid']),
                },
            },
            'message': 'CSV parsed.',
            'errors': [],
        })

    def _build_member_indexes(self, group):
        members = group.members.select_related('user').all()
        users_by_id = {str(member.user.id): member.user for member in members}
        users_by_username = {member.user.username.lower(): member.user for member in members if member.user.username}
        users_by_email = {(member.user.email or '').lower(): member.user for member in members if member.user.email}
        return {
            'by_id': users_by_id,
            'by_username': users_by_username,
            'by_email': users_by_email,
        }

    def _resolve_user(self, raw_value, member_indexes, label):
        if not raw_value or not raw_value.strip():
            raise ValidationError([f'{label} is required.'])
        value = raw_value.strip()
        user = None
        if UUID_PATTERN.match(value):
            user = member_indexes['by_id'].get(value)
        if user is None and '@' in value:
            user = member_indexes['by_email'].get(value.lower())
        if user is None:
            user = member_indexes['by_username'].get(value.lower())
        if user is None:
            raise ValidationError([f'Could not resolve user for {label}: {value}'])
        return user

    def _parse_csv_row(self, raw_row, group, member_indexes, row_number):
        row = {key.strip().lower(): (value or '').strip() for key, value in raw_row.items()}

        title = row.get('title')
        date_str = row.get('date')
        amount_str = row.get('amount')
        currency = (row.get('currency') or 'INR').upper()
        exchange_rate_str = row.get('exchange_rate')
        category = row.get('category') or 'Other'
        description = row.get('description') or ''
        paid_by_value = row.get('paid_by') or row.get('paid_by_username') or row.get('paid_by_email')
        split_type = (row.get('split_type') or 'EQUAL').upper()
        splits_value = row.get('splits')

        if not title:
            raise ValidationError(['title is required'])
        if not date_str:
            raise ValidationError(['date is required'])
        if not amount_str:
            raise ValidationError(['amount is required'])

        try:
            amount = Decimal(amount_str)
        except InvalidOperation:
            raise ValidationError(['amount must be a valid number'])
        if amount <= 0:
            raise ValidationError(['amount must be positive'])

        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            raise ValidationError(['date must be YYYY-MM-DD'])

        paid_by_user = self._resolve_user(paid_by_value, member_indexes, 'paid_by')

        if currency == Expense.CURRENCY_INR:
            exchange_rate = Decimal('1')
            amount_inr = amount
        else:
            if not exchange_rate_str:
                raise ValidationError(['exchange_rate is required for USD expenses'])
            try:
                exchange_rate = Decimal(exchange_rate_str)
            except InvalidOperation:
                raise ValidationError(['exchange_rate must be a valid number'])
            if exchange_rate <= 0:
                raise ValidationError(['exchange_rate must be greater than zero'])
            amount_inr = (amount * exchange_rate).quantize(Decimal('0.01'))

        payload = {
            'group': str(group.id),
            'title': title,
            'description': description,
            'amount': str(amount),
            'currency': currency,
            'exchange_rate': str(exchange_rate),
            'amount_inr': str(amount_inr),
            'date': date_str,
            'category': category,
            'paid_by_id': str(paid_by_user.id),
            'split_type': split_type,
            'import_source': Expense.IMPORT_CSV,
            'import_row_number': row_number,
        }

        if split_type != Expense.SPLIT_EQUAL:
            payload['splits'] = self._parse_splits(splits_value, split_type, member_indexes)

        serializer = ExpenseSerializer(data=payload)
        if not serializer.is_valid():
            raise ValidationError(serializer.errors)

        return payload

    def _parse_splits(self, raw_splits, split_type, member_indexes):
        if not raw_splits:
            raise ValidationError([f'splits are required for split type {split_type}'])

        entries = [entry.strip() for entry in raw_splits.split(';') if entry.strip()]
        if not entries:
            raise ValidationError([f'splits are required for split type {split_type}'])

        splits = []
        for entry in entries:
            if '=' not in entry:
                raise ValidationError([f'Each split entry must use user=value syntax: {entry}'])
            user_key, raw_value = map(str.strip, entry.split('=', 1))
            user = self._resolve_user(user_key, member_indexes, 'split user')

            if split_type == Expense.SPLIT_UNEQUAL:
                try:
                    amount_owed = Decimal(raw_value)
                except InvalidOperation:
                    raise ValidationError([f'Invalid unequal split amount for {user.username}: {raw_value}'])
                if amount_owed < 0:
                    raise ValidationError([f'Unequal split amounts must be non-negative for {user.username}'])
                splits.append({'user_id': str(user.id), 'amount_owed': str(amount_owed)})
                continue

            if split_type == Expense.SPLIT_PERCENTAGE:
                value = raw_value.rstrip('%').strip()
                try:
                    percentage = Decimal(value)
                except InvalidOperation:
                    raise ValidationError([f'Invalid percentage value for {user.username}: {raw_value}'])
                if percentage < 0:
                    raise ValidationError([f'Percentage must be non-negative for {user.username}'])
                # include provisional amount_owed so nested serializer validation passes;
                # the parent ExpenseSerializer will compute the correct owed amounts later
                splits.append({'user_id': str(user.id), 'percentage': str(percentage), 'amount_owed': '0'})
                continue

            if split_type == Expense.SPLIT_SHARE:
                try:
                    shares = int(raw_value)
                except ValueError:
                    raise ValidationError([f'Invalid share value for {user.username}: {raw_value}'])
                if shares < 0:
                    raise ValidationError([f'Shares must be non-negative for {user.username}'])
                # include provisional amount_owed so nested serializer validation passes;
                # the parent ExpenseSerializer will compute the correct owed amounts later
                splits.append({'user_id': str(user.id), 'shares': shares, 'amount_owed': '0'})
                continue

            raise ValidationError([f'Unsupported split type: {split_type}'])
        return splits


class CsvImportCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        group_id = request.data.get('group_id') or request.data.get('group')
        if not group_id:
            return Response({'success': False, 'data': None, 'message': 'group_id is required.', 'errors': ['group_id_required']}, status=status.HTTP_400_BAD_REQUEST)

        group = get_object_or_404(Group, pk=group_id)
        if not group.members.filter(user=request.user).exists():
            return Response({'success': False, 'data': None, 'message': 'Only group members may import expenses.', 'errors': ['permission_denied']}, status=status.HTTP_403_FORBIDDEN)

        rows = request.data.get('rows')
        if not isinstance(rows, list):
            return Response({'success': False, 'data': None, 'message': 'rows must be an array.', 'errors': ['rows_required']}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        errors = []
        for index, row in enumerate(rows, start=1):
            parsed_row = dict(row)
            parsed_row['group'] = str(group.id)
            parsed_row['import_source'] = Expense.IMPORT_CSV
            parsed_row['import_row_number'] = row.get('import_row_number') or index
            serializer = ExpenseSerializer(data=parsed_row)
            if serializer.is_valid():
                expense = serializer.save(paid_by_id=parsed_row['paid_by_id'])
                created.append({'row_number': parsed_row['import_row_number'], 'id': str(expense.id)})
            else:
                errors.append({'row_number': parsed_row.get('import_row_number', index), 'errors': serializer.errors})

        if errors:
            return Response({'success': False, 'data': {'created': created}, 'message': 'Some rows failed validation.', 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'data': {'created': created}, 'message': 'Imported CSV rows.', 'errors': []}, status=status.HTTP_201_CREATED)
