import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function PickRedirectPage() {
  // Get the correct competition ID
  const competition = await prisma.competition.findFirst({
    where: { name: "JKC Invitational" }
  });
  
  if (competition) {
    redirect(`/competition/${competition.id}/pick`);
  } else {
    redirect('/');
  }
}

