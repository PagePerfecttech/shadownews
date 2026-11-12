/* eslint-disable */
const { SignJWT, jwtVerify } = require('jose');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_for_dev');
  
  const bcrypt = require('bcryptjs');
  const admin = await prisma.admin.findUnique({
    where: { email: 'admin@shadownews.in' },
  });
  
  console.log("Admin from DB:", admin);
  const isMatch = await bcrypt.compare('admin123', admin.passwordHash);
  console.log("Password matches 'admin123':", isMatch);
  
  const token = await new SignJWT({ adminId: admin.id, email: admin.email, role: admin.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
    
  console.log("Generated Token:", token);
  
  const result = await jwtVerify(token, secret);
  const payload = result.payload;
  console.log("Verified Payload:", payload);
  
  const adminId = payload.adminId;
  const email = payload.email;
  
  const adminVerified = await prisma.admin.findFirst({
    where: {
      id: adminId,
      email,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
  
  console.log("Verified Admin:", adminVerified);
}

main().catch(console.error).finally(() => prisma.$disconnect());
