import Chart from "@/components/ClientChartLoader";

export default async function CompanyPage(props) {
  const { companyId } = await props.params;

  return <Chart companyId={companyId} />;
}
