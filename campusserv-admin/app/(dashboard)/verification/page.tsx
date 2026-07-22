import { redirect } from 'next/navigation';

export default function VerificationRedirectPage() {
  redirect('/providers/pending');
}
