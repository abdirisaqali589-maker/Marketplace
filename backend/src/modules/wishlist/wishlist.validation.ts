import { z } from 'zod';

export const wishlistItemSchema = z.object({
  productId: z.string().uuid(),
});
