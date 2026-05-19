import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricCardProps {
  label: string
  value: string | number
  delta?: string
  deltaPositive?: boolean
  sub?: string
  loading?: boolean
}

export default function MetricCard({ label, value, delta, deltaPositive, sub, loading }: MetricCardProps) {
  return (
    <Card className="border border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </>
        )}
        {!loading && delta && (
          <p className={`text-xs mt-1 ${deltaPositive ? 'text-black' : 'text-gray-500'}`}>
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
