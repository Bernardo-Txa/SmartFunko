import 'package:flutter/material.dart';

import '../../shared/theme/app_colors.dart';
import 'data/order_models.dart';

Color approvalStatusColor(OrderApprovalStatus status) => switch (status) {
  OrderApprovalStatus.awaitingApproval => AppColors.warning,
  OrderApprovalStatus.approved => AppColors.success,
  OrderApprovalStatus.rejected => AppColors.danger,
  OrderApprovalStatus.unknown => AppColors.lightTextSecondary,
};

Color paymentStatusColor(OrderPaymentStatus status) => switch (status) {
  OrderPaymentStatus.unpaid => AppColors.warning,
  OrderPaymentStatus.checkoutCreated => AppColors.info,
  OrderPaymentStatus.paid => AppColors.success,
  OrderPaymentStatus.refundPending => AppColors.warning,
  OrderPaymentStatus.refunded => AppColors.info,
  OrderPaymentStatus.cancelled => AppColors.danger,
  OrderPaymentStatus.unknown => AppColors.lightTextSecondary,
};

Color fulfillmentStatusColor(OrderFulfillmentStatus status) => switch (status) {
  OrderFulfillmentStatus.awaitingClosing => AppColors.lightTextSecondary,
  OrderFulfillmentStatus.requested => AppColors.info,
  OrderFulfillmentStatus.received => AppColors.brandSky,
  OrderFulfillmentStatus.shipped => AppColors.success,
  OrderFulfillmentStatus.cancelled => AppColors.danger,
  OrderFulfillmentStatus.unknown => AppColors.lightTextSecondary,
};
