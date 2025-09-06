// import Chart from "@/components/ClientChartLoader";

export default async function USCompanyPage(props) {
  const { companyId } = await props.params;

  //   return <Chart companyId={companyId} />;
  return (
    <div>
      <h1>{companyId}</h1>
    </div>
  );
}
