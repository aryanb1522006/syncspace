import { z } from 'zod';

export const teamContactSchema = z.object({
  whatsappNumber: z.string().trim().max(40)
    .transform((value) => value.replace(/[ ()-]/g, ''))
    .pipe(z.union([
      z.literal(''),
      z.string().regex(/^\+[1-9]\d{6,14}$/, 'Use an international phone number such as +919876543210')
    ])),
  discordUsername: z.string().trim().toLowerCase()
    .pipe(z.union([
      z.literal(''),
      z.string().regex(/^(?!.*\.\.)[a-z0-9_.]{2,32}$/, 'Use your Discord username, for example campus.builder')
    ])),
  contactEmail: z.string().trim().max(254).pipe(z.union([z.literal(''), z.string().email()]))
});

export const groupInviteSchema = z.object({
  groupInviteUrl: z.string().trim().max(250).pipe(z.union([
    z.literal(''),
    z.string().regex(
      /^https:\/\/(?:chat\.whatsapp\.com\/|discord\.gg\/|discord\.com\/invite\/)[A-Za-z0-9_-]{2,100}\/?(?:\?[^#\s]*)?$/,
      'Paste a WhatsApp group or Discord server invite link'
    ).transform((url) => new URL(url).origin + new URL(url).pathname.replace(/\/$/, ''))
  ]))
});
