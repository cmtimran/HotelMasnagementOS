import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, SubscriptionTier } from '../types/index.js';

const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  starter: 1,
  pro: 2,
  enterprise: 3,
};

/**
 * SaaS Subscription Tier Guard
 * Blocks features if the property/tenant has not subscribed to the required tier
 */
export const requireTier = (minTier: SubscriptionTier) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userTier = req.user?.subscriptionTier || 'starter';
    const currentRank = TIER_HIERARCHY[userTier] || 1;
    const requiredRank = TIER_HIERARCHY[minTier] || 1;

    if (currentRank >= requiredRank) {
      next();
      return;
    }

    res.status(402).json({
      success: false,
      error: `Payment Required: Feature requires '${minTier}' subscription plan (Current: '${userTier}')`,
      metadata: {
        currentTier: userTier,
        requiredTier: minTier,
        upgradeUrl: '/settings/subscription',
      },
    });
  };
};
