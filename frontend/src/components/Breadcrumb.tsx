import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb = ({ items }: BreadcrumbProps) => {
  return (
    <nav className="mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-2 text-[12px] font-sans text-journal-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-journal-faint" />
              )}
              {isLast ? (
                <span className="text-journal-ink font-medium">{item.label}</span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="hover:text-journal-teal transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
