import { redirect } from 'next/navigation';

export default async function SharePage({ params }: { params: { shareId: string } }) {
    // This page is deprecated and replaced by the new doctor view.
    // We will redirect any old links to the doctor dashboard.
    redirect('/doctor/dashboard');
}
