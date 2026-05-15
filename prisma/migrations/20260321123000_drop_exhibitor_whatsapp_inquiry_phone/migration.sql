-- Product WhatsApp redirects use existing `primaryContactPhone`; drop separate field if present.
ALTER TABLE "Exhibitor" DROP COLUMN IF EXISTS "whatsappInquiryPhone";

-- Track WhatsApp inquiry link clicks per product (public redirect)
ALTER TABLE "ExhibitorProduct" ADD COLUMN IF NOT EXISTS "whatsappClickCount" INTEGER NOT NULL DEFAULT 0;
