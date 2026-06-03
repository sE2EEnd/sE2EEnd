import { useTranslation } from 'react-i18next';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';

function buildPaginationItems(totalPages: number, currentPage: number): (number | 'ellipsis')[] {
  return Array.from({ length: totalPages }, (_, i) => i)
    .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1)
    .reduce<(number | 'ellipsis')[]>((acc, i, idx, arr) => {
      if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
      acc.push(i);
      return acc;
    }, []);
}

interface TablePaginationProps {
  totalPages: number;
  totalElements: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  loading?: boolean;
}

export default function TablePagination({
  totalPages, totalElements, currentPage, setCurrentPage, pageSize, loading = false,
}: TablePaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  const items = buildPaginationItems(totalPages, currentPage);

  return (
    <div className="px-6 py-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {t('common.pagination.showing', {
          from: currentPage * pageSize + 1,
          to: Math.min((currentPage + 1) * pageSize, totalElements),
          total: totalElements,
        })}
      </p>
      <Pagination className="w-auto mx-0">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage(currentPage - 1)}
              aria-disabled={currentPage === 0 || loading}
              className={currentPage === 0 || loading ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
            />
          </PaginationItem>
          {items.map((item, idx) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`e${idx}`}><PaginationEllipsis /></PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  isActive={currentPage === item}
                  onClick={() => setCurrentPage(item as number)}
                  className="cursor-pointer"
                >
                  {(item as number) + 1}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage(currentPage + 1)}
              aria-disabled={currentPage >= totalPages - 1 || loading}
              className={currentPage >= totalPages - 1 || loading ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
