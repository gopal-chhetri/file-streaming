import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { BrowseLayout } from '../../layouts/browse-layout'
import { useWatchHistory } from '../../hooks/use-watch-history'
import { Link } from '@tanstack/react-router'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { BookOpen } from '@phosphor-icons/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/library',
  component: LibraryPage,
})

function LibraryPage() {
  const { data: history, isLoading } = useWatchHistory()

  return (
    <BrowseLayout>
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Library</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Your saved videos and watch history
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex h-12 items-center gap-4 px-4">
              <div className="h-4 w-32 animate-shimmer rounded" />
              <div className="h-4 w-24 animate-shimmer rounded" />
            </div>
          ))}
        </div>
      ) : history && history.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Video</TableHeaderCell>
              <TableHeaderCell>Progress</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.videoId}>
                <TableCell className="font-medium">
                  <Link
                    to="/watch/$videoId"
                    params={{ videoId: item.videoId }}
                    className="text-text-primary hover:text-accent transition-colors"
                  >
                    {item.videoId}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-2 w-32 overflow-hidden rounded-full bg-subtle">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-300"
                        style={{ width: `${Math.round(item.progress)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-text-muted">
                      {Math.round(item.progress)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={item.progress >= 90 ? 'success' : 'default'}
                  >
                    {item.progress >= 90 ? 'Watched' : 'In progress'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <BookOpen size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Your library is empty</p>
          <p className="text-xs text-text-muted mt-1">
            Videos you watch will appear here
          </p>
        </div>
      )}
    </div>
    </BrowseLayout>
  )
}
