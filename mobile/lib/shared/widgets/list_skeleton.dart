import 'package:flutter/material.dart';

import 'smart_skeleton.dart';

class ListSkeleton extends StatelessWidget {
  const ListSkeleton({this.itemCount = 4, this.imageSize = 72, super.key});

  final int itemCount;
  final double imageSize;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var index = 0; index < itemCount; index++)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: imageSize >= 80
                ? const RaffleCardSkeleton()
                : const OrderCardSkeleton(),
          ),
      ],
    );
  }
}
