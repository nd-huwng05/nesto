from django.urls import path

from payments.views import (
    CheckoutPaymentCompleteView,
    MoMoIpnView,
    MoMoPaymentView,
    MoMoReturnView,
    PaymentStatusView,
    PaymentSyncView,
    ZaloPayCallbackView,
    ZaloPayPaymentView,
)

urlpatterns = [
    path("momo/", MoMoPaymentView.as_view(), name="payments-momo"),
    path("momo/ipn/", MoMoIpnView.as_view(), name="payments-momo-ipn"),
    path("momo/return/", MoMoReturnView.as_view(), name="payments-momo-return"),
    path("zalopay/", ZaloPayPaymentView.as_view(), name="payments-zalopay"),
    path("zalopay/callback/", ZaloPayCallbackView.as_view(), name="payments-zalopay-callback"),
    path("checkout/<str:checkout_session_id>/complete/", CheckoutPaymentCompleteView.as_view(), name="payments-checkout-complete"),
    path("status/<str:booking_id>/", PaymentStatusView.as_view(), name="payments-status"),
    path("sync/<str:booking_id>/", PaymentSyncView.as_view(), name="payments-sync"),
]
