import DashboardLayout from "../components/layout/DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout>

      <h1 className="text-2xl font-bold mb-4">
        Dashboard
      </h1>

      <div className="grid grid-cols-3 gap-4">

        <Card title="Bots" />
        <Card title="Conversations" />
        <Card title="Messages" />

      </div>

    </DashboardLayout>
  );
}

function Card({ title }: any) {
  return (
    <div className="bg-white p-4 rounded shadow">

      <div className="text-gray-500">
        {title}
      </div>

      <div className="text-2xl font-bold">
        0
      </div>

    </div>
  );
}