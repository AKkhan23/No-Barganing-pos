import { Router, Request, Response } from 'express';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager', 'cashier'));

function computeEAN13CheckDigit(code: string): string {
  if (!/^\d{12}$/.test(code)) return '';
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return code + check;
}

/**
 * @openapi
 * /barcode-utils/ean13/{code}:
 *   get:
 *     tags: [Barcode Utils]
 *     summary: Compute EAN-13 check digit from 12-digit code
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *         description: 12-digit barcode prefix
 *     responses:
 *       200:
 *         description: Full barcode with check digit
 *       400:
 *         description: Code must be exactly 12 digits
 */
router.get('/ean13/:code', async (req: Request, res: Response) => {
  const { code } = req.params;
  if (!/^\d{12}$/.test(code)) {
    res.status(400).json({ detail: 'Code must be exactly 12 digits' });
    return;
  }
  const fullBarcode = computeEAN13CheckDigit(code);
  res.json({ original: code, barcode: fullBarcode, check_digit: fullBarcode[12] });
});

export default router;
