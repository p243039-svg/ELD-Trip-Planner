from django.urls import path
from .views import PlanTripView, TripListView, TripDetailView

urlpatterns = [
    path('plan-trip/', PlanTripView.as_view(), name='plan-trip'),
    path('trips/', TripListView.as_view(), name='trip-list'),
    path('trips/<int:pk>/', TripDetailView.as_view(), name='trip-detail'),
]
