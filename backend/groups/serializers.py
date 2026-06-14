from rest_framework import serializers

from users.serializers import UserSerializer
from .models import Group, GroupMember


class GroupMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = GroupMember
        fields = ('id', 'user', 'user_id', 'role', 'joined_at', 'left_at')
        read_only_fields = ('id', 'user')

    def create(self, validated_data):
        user_id = validated_data.pop('user_id')
        validated_data['user_id'] = user_id
        return super().create(validated_data)


class GroupSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Group
        fields = ('id', 'name', 'description', 'category', 'created_by', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')


class GroupDetailSerializer(GroupSerializer):
    members = GroupMemberSerializer(source='groupmember_set', many=True, read_only=True)

    class Meta(GroupSerializer.Meta):
        fields = GroupSerializer.Meta.fields + ('members',)
