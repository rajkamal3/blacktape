import CompanyDetailsUS from "@/components/CompanyDetailsUS";

export default async function USCompanyPage(props) {
  const { companyId } = await props.params;

  return <CompanyDetailsUS companyId={companyId} />;
}
