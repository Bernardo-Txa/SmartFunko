import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class WishlistButton extends StatelessWidget {
  const WishlistButton({
    required this.onPressed,
    this.isSelected = false,
    super.key,
  });

  final VoidCallback onPressed;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    return IconButton.filledTonal(
      tooltip: isSelected ? 'Remover dos favoritos' : 'Favoritar',
      style: IconButton.styleFrom(
        backgroundColor: Colors.black.withValues(alpha: 0.42),
        foregroundColor: isSelected ? AppColors.accent : AppColors.textPrimary,
      ),
      onPressed: onPressed,
      icon: Icon(
        isSelected ? Icons.favorite_rounded : Icons.favorite_border_rounded,
      ),
    );
  }
}
