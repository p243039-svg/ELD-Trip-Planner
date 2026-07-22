from django.db import models
from django.contrib.auth.models import User


class Trip(models.Model):
    """Stores a planned ELD trip with its computed result."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trips')
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_used = models.FloatField(help_text='Hours already used in the current 70-hr/8-day cycle')
    route_data = models.JSONField(null=True, blank=True, help_text='Full computed response: route + daily_logs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Trip({self.user.username}: {self.current_location} → {self.dropoff_location})"
