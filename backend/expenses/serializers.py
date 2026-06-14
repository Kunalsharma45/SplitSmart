from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP

from rest_framework import serializers

from groups.models import Group, get_active_members_on_date
from users.serializers import UserSerializer
from .models import Expense, ExpenseSplit


class ExpenseSplitSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)
    original_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    shares = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = ExpenseSplit
        fields = ('id', 'user', 'user_id', 'amount_owed', 'original_amount', 'percentage', 'shares', 'is_settled')
        read_only_fields = ('id', 'user', 'is_settled')

    def create(self, validated_data):
        validated_data['user_id'] = validated_data.pop('user_id')
        return super().create(validated_data)


class ExpenseSerializer(serializers.ModelSerializer):
    paid_by = UserSerializer(read_only=True)
    paid_by_id = serializers.UUIDField(write_only=True)
    splits = ExpenseSplitSerializer(many=True, required=False)

    class Meta:
        model = Expense
        fields = (
            'id', 'group', 'title', 'description', 'amount', 'currency', 'amount_inr', 'exchange_rate',
            'date', 'category', 'paid_by', 'paid_by_id', 'split_type', 'splits', 'is_deleted',
            'deleted_at', 'deleted_by', 'import_source', 'import_row_number', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'paid_by', 'deleted_at', 'deleted_by', 'created_at', 'updated_at')

    def validate(self, attrs):
        currency = attrs['currency']
        amount = Decimal(str(attrs['amount']))
        if currency == Expense.CURRENCY_USD and attrs.get('exchange_rate') in (None, 0):
            raise serializers.ValidationError({'exchange_rate': 'Exchange rate is required for USD expenses.'})
        if currency == Expense.CURRENCY_INR:
            attrs['exchange_rate'] = Decimal('1')
            attrs['amount_inr'] = amount
        else:
            attrs['exchange_rate'] = Decimal(str(attrs['exchange_rate']))
            attrs['amount_inr'] = (amount * attrs['exchange_rate']).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        split_type = attrs['split_type']
        splits = attrs.get('splits') or []
        if split_type != Expense.SPLIT_EQUAL and not splits:
            raise serializers.ValidationError({'splits': 'Splits are required for this split type.'})

        group = attrs['group']
        date = attrs['date']
        active_members = get_active_members_on_date(group, date)
        active_ids = {member.id for member in active_members}

        if split_type == Expense.SPLIT_EQUAL:
            if not active_members:
                raise serializers.ValidationError({'split_type': 'No active members available for equal split.'})
            attrs['splits'] = self._build_equal_splits(attrs, active_members)
        elif split_type == Expense.SPLIT_UNEQUAL:
            self._validate_unequal_splits(attrs, active_ids)
        elif split_type == Expense.SPLIT_PERCENTAGE:
            self._validate_percentage_splits(attrs, active_members)
        elif split_type == Expense.SPLIT_SHARE:
            self._validate_share_splits(attrs, active_members)
        else:
            raise serializers.ValidationError({'split_type': 'Invalid split type.'})

        return attrs

    def _build_equal_splits(self, attrs, active_members):
        amount_inr = Decimal(str(attrs['amount_inr']))
        splitter = len(active_members)
        base_amount = (amount_inr / splitter).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
        remainder = amount_inr - (base_amount * splitter)
        payer_id = attrs['paid_by_id']
        ordered_members = sorted(active_members, key=lambda member: member.username)
        splits = []
        for member in ordered_members:
            amount_owed = base_amount
            if remainder > Decimal('0') and member.id == payer_id:
                amount_owed += remainder
            splits.append({
                'user_id': member.id,
                'amount_owed': amount_owed,
                'original_amount': self._original_amount(amount_owed, attrs['exchange_rate'], attrs['currency']),
                'percentage': None,
                'shares': None,
            })
        if remainder > Decimal('0') and payer_id not in {member.id for member in active_members}:
            first_member = ordered_members[0]
            splits[0]['amount_owed'] = (splits[0]['amount_owed'] + remainder).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            splits[0]['original_amount'] = self._original_amount(splits[0]['amount_owed'], attrs['exchange_rate'], attrs['currency'])
        return splits

    def _validate_unequal_splits(self, attrs, active_ids):
        splits = attrs.get('splits', [])
        self._validate_split_members(splits, active_ids)
        total = sum(Decimal(str(split['amount_owed'])) for split in splits)
        amount_inr = Decimal(str(attrs['amount_inr']))
        if abs(total - amount_inr) > Decimal('1.00'):
            raise serializers.ValidationError({'splits': 'Unequal splits must sum to the total amount in INR within ±₹1.'})
        for split in splits:
            split['original_amount'] = self._original_amount(Decimal(str(split['amount_owed'])), attrs['exchange_rate'], attrs['currency'])
            split.setdefault('percentage', None)
            split.setdefault('shares', None)

    def _validate_percentage_splits(self, attrs, active_members):
        splits = attrs.get('splits', [])
        active_ids = {member.id for member in active_members}
        self._validate_split_members(splits, active_ids)
        percentages = [Decimal(str(split.get('percentage') or 0)) for split in splits]
        if sum(percentages) != Decimal('100'):
            raise serializers.ValidationError({'splits': 'Percentages must sum to 100%.'})
        amount_inr = Decimal(str(attrs['amount_inr']))
        ordered_members = sorted(active_members, key=lambda member: member.username)
        computed = []
        total_allocated = Decimal('0')
        for split in splits:
            percent = Decimal(str(split['percentage']))
            owed = (amount_inr * percent / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
            computed.append((split, owed))
            total_allocated += owed
        remainder = amount_inr - total_allocated
        payer_id = attrs['paid_by_id']
        if remainder > Decimal('0'):
            split_to_adjust = next((split for split in splits if split['user_id'] == payer_id), None)
            if not split_to_adjust:
                split_to_adjust = next(split for split in splits if split['user_id'] in {member.id for member in ordered_members})
            split_to_adjust['amount_owed'] = (Decimal(str(split_to_adjust.get('amount_owed', '0'))) + remainder).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        for split, owed in computed:
            if 'amount_owed' not in split or Decimal(str(split['amount_owed'])) != owed:
                split['amount_owed'] = owed
            split['original_amount'] = self._original_amount(owed, attrs['exchange_rate'], attrs['currency'])
            split.setdefault('shares', None)

    def _validate_share_splits(self, attrs, active_members):
        splits = attrs.get('splits', [])
        active_ids = {member.id for member in active_members}
        self._validate_split_members(splits, active_ids)
        share_values = [int(split.get('shares') or 0) for split in splits]
        total_shares = sum(share_values)
        if total_shares <= 0:
            raise serializers.ValidationError({'splits': 'Shares must be provided and greater than zero.'})
        amount_inr = Decimal(str(attrs['amount_inr']))
        total_allocated = Decimal('0')
        for split in splits:
            share = Decimal(str(split['shares']))
            owed = (amount_inr * share / Decimal(total_shares)).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
            split['amount_owed'] = owed
            split['original_amount'] = self._original_amount(owed, attrs['exchange_rate'], attrs['currency'])
            split.setdefault('percentage', None)
            total_allocated += owed
        remainder = amount_inr - total_allocated
        if remainder > Decimal('0'):
            payer_id = attrs['paid_by_id']
            split_to_adjust = next((split for split in splits if split['user_id'] == payer_id), None)
            if not split_to_adjust:
                split_to_adjust = splits[0]
            split_to_adjust['amount_owed'] = (Decimal(str(split_to_adjust['amount_owed'])) + remainder).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            split_to_adjust['original_amount'] = self._original_amount(Decimal(str(split_to_adjust['amount_owed'])), attrs['exchange_rate'], attrs['currency'])

    def _validate_split_members(self, splits, active_ids):
        split_ids = {str(split['user_id']) for split in splits}
        active_ids = {str(member_id) for member_id in active_ids}
        missing = active_ids - split_ids
        extra = split_ids - active_ids
        if missing or extra:
            errors = []
            if missing:
                errors.append('Missing active members from splits.')
            if extra:
                errors.append('Splits contain users not active on this date.')
            raise serializers.ValidationError({'splits': ' '.join(errors)})

    def _original_amount(self, amount_inr, exchange_rate, currency):
        if currency == Expense.CURRENCY_INR:
            return amount_inr
        return (Decimal(str(amount_inr)) / exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def create(self, validated_data):
        paid_by_id = validated_data.pop('paid_by_id')
        splits_data = validated_data.pop('splits', [])
        expense = Expense.objects.create(paid_by_id=paid_by_id, **validated_data)
        for split_data in splits_data:
            split_data['expense'] = expense
            split_data['user_id'] = split_data.pop('user_id')
            ExpenseSplit.objects.create(**split_data)
        return expense

    def update(self, instance, validated_data):
        splits_data = validated_data.pop('splits', None)
        instance = super().update(instance, validated_data)
        if splits_data is not None:
            instance.splits.all().delete()
            for split_data in splits_data:
                split_data['expense'] = instance
                split_data['user_id'] = split_data.pop('user_id')
                ExpenseSplit.objects.create(**split_data)
        return instance
