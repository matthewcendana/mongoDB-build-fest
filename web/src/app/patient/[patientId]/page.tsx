import PatientEnrollmentClient from "@/components/patient/PatientEnrollmentClient";

export default async function PatientEnrollmentPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  return <PatientEnrollmentClient patientId={patientId} />;
}
