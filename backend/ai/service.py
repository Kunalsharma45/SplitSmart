import logging
from django.conf import settings
import openai
from ai import prompts

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    def explain_anomaly(anomaly_type, raw_row_data, group_members, membership_dates,
                        exchange_rate=None, duplicate_row_data=None):
        """
        Explain a CSV anomaly in simple, plain English using OpenAI gpt-4o-mini.
        If OpenAI API fails, falls back gracefully to a manual review response.
        """
        # Map anomaly types to static fields: recommended_action, action_label, confidence
        meta_mapping = {
            'DUPLICATE_ROW': {
                'recommended_action': 'KEEP',
                'action_label': 'Keep Original, Remove Duplicate',
                'confidence': 'HIGH'
            },
            'NEGATIVE_AMOUNT': {
                'recommended_action': 'CONVERT',
                'action_label': 'Treat as Refund',
                'confidence': 'MEDIUM'
            },
            'SETTLEMENT_AS_EXPENSE': {
                'recommended_action': 'CONVERT',
                'action_label': 'Convert to Settlement',
                'confidence': 'HIGH'
            },
            'CURRENCY_MISMATCH': {
                'recommended_action': 'CONVERT',
                'action_label': 'Convert Currency',
                'confidence': 'MEDIUM'
            },
            'MEMBER_NOT_IN_GROUP': {
                'recommended_action': 'CONFIRM',
                'action_label': 'Create Placeholder',
                'confidence': 'HIGH'
            },
            'DATE_OUTSIDE_MEMBERSHIP': {
                'recommended_action': 'EDIT',
                'action_label': 'Adjust Split',
                'confidence': 'HIGH'
            },
            'MISSING_REQUIRED_FIELD': {
                'recommended_action': 'REJECT',
                'action_label': 'Reject Row',
                'confidence': 'HIGH'
            },
            'INCONSISTENT_DATE_FORMAT': {
                'recommended_action': 'CONFIRM',
                'action_label': 'Confirm Date',
                'confidence': 'MEDIUM'
            },
            'AMOUNT_FORMAT_ISSUE': {
                'recommended_action': 'CONFIRM',
                'action_label': 'Confirm Fix',
                'confidence': 'HIGH'
            },
            'SPLIT_SUM_MISMATCH': {
                'recommended_action': 'EDIT',
                'action_label': 'Edit Splits',
                'confidence': 'HIGH'
            },
            'DUPLICATE_SETTLEMENT': {
                'recommended_action': 'REJECT',
                'action_label': 'Skip Row',
                'confidence': 'HIGH'
            },
            'UNKNOWN_SPLIT_TYPE': {
                'recommended_action': 'EDIT',
                'action_label': 'Map Split Type',
                'confidence': 'MEDIUM'
            }
        }

        fallback_meta = {
            'recommended_action': 'MANUAL_REVIEW',
            'action_label': 'Review Manually',
            'confidence': 'LOW'
        }

        meta = meta_mapping.get(anomaly_type, fallback_meta)

        # Build prompt template parameters
        row_number = raw_row_data.get('row_number', 'Unknown')
        date = raw_row_data.get('date', 'Unknown')
        amount = raw_row_data.get('amount', 'Unknown')
        currency = raw_row_data.get('currency', 'INR')
        description = raw_row_data.get('description', '')
        paid_by = raw_row_data.get('paid_by', 'Unknown')
        split_type = raw_row_data.get('split_type', 'EQUAL')
        splits = raw_row_data.get('splits', '')

        # Handle duplicate row parameters
        dup_row_number = ''
        dup_date = ''
        dup_amount = ''
        dup_currency = 'INR'
        dup_description = ''
        dup_paid_by = ''
        if duplicate_row_data:
            dup_row_number = duplicate_row_data.get('row_number', 'Unknown')
            dup_date = duplicate_row_data.get('date', 'Unknown')
            dup_amount = duplicate_row_data.get('amount', 'Unknown')
            dup_currency = duplicate_row_data.get('currency', 'INR')
            dup_description = duplicate_row_data.get('description', '')
            dup_paid_by = duplicate_row_data.get('paid_by', 'Unknown')

        members_list = ", ".join(group_members)

        template = prompts.TEMPLATES.get(anomaly_type)
        if not template:
            # Fallback if anomaly type template is missing
            return {
                "explanation": f"Unrecognized anomaly type: {anomaly_type}. Please review raw row #{row_number} manually.",
                "recommended_action": meta.get('recommended_action'),
                "action_label": meta.get('action_label'),
                "confidence": "LOW",
                "ai_generated": False
            }

        # Format user prompt
        try:
            user_prompt = template.format(
                row_number=row_number,
                date=date,
                amount=amount,
                currency=currency,
                description=description,
                paid_by=paid_by,
                split_type=split_type,
                splits=splits,
                dup_row_number=dup_row_number,
                dup_date=dup_date,
                dup_amount=dup_amount,
                dup_currency=dup_currency,
                dup_description=dup_description,
                dup_paid_by=dup_paid_by,
                members_list=members_list,
                membership_dates=str(membership_dates),
                exchange_rate=str(exchange_rate or '')
            )
        except Exception as e:
            logger.error(f"Error formatting prompt: {e}")
            user_prompt = f"Explain the problem with row #{row_number} of split type {split_type} and amount {amount}."

        # Call OpenAI/Gemini Chat Completion
        gemini_key = getattr(settings, 'GEMINI_API_KEY', '')
        openai_key = getattr(settings, 'OPENAI_API_KEY', '')

        api_key = None
        model = 'gpt-4o-mini'
        api_base = "https://api.openai.com/v1"

        if gemini_key:
            api_key = gemini_key
            api_base = "https://generativelanguage.googleapis.com/v1beta/openai/"
            model = getattr(settings, 'GEMINI_MODEL', 'gemini-1.5-flash')
        elif openai_key:
            api_key = openai_key
            if openai_key.startswith('AIzaSy'):
                api_base = "https://generativelanguage.googleapis.com/v1beta/openai/"
                model = getattr(settings, 'GEMINI_MODEL', 'gemini-1.5-flash')
            else:
                api_base = "https://api.openai.com/v1"
                model = getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')

        if not api_key:
            logger.warning("Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured.")
            return {
                "explanation": "We could not generate an AI explanation right now. Please review the raw data above and decide whether to keep or reject this row.",
                "recommended_action": "MANUAL_REVIEW",
                "action_label": "Review Manually",
                "confidence": "LOW",
                "ai_generated": False
            }

        try:
            openai.api_key = api_key
            openai.api_base = api_base
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": prompts.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=200,
                temperature=0.3,
                timeout=10
            )
            explanation = response['choices'][0]['message']['content'].strip()
            return {
                "explanation": explanation,
                "recommended_action": meta.get('recommended_action'),
                "action_label": meta.get('action_label'),
                "confidence": meta.get('confidence'),
                "ai_generated": True
            }
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            return {
                "explanation": "We could not generate an AI explanation right now. Please review the raw data above and decide whether to keep or reject this row.",
                "recommended_action": "MANUAL_REVIEW",
                "action_label": "Review Manually",
                "confidence": "LOW",
                "ai_generated": False
            }
