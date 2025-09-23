interface StatsCardProps {
  title: string
  value: number
  color: 'blue' | 'green' | 'orange' | 'purple'
  icon?: React.ReactNode
}

export default function StatsCard({ title, value, color, icon }: StatsCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700',
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}