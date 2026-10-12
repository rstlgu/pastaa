import { forwardRef, useMemo, type AnchorHTMLAttributes } from "react";
import {
  Link as RouterLink,
  useNavigate,
  useLocation,
  useParams as routerParams,
} from "react-router-dom";
export const Link = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>(function Link({ href, ...props }, ref) {
  return /^(https?:|mailto:|#)/.test(href) ? (
    <a ref={ref} href={href} {...props} />
  ) : (
    <RouterLink ref={ref} to={href} {...props} />
  );
});
export const useParams = routerParams;
export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (to: string) => navigate(to),
      replace: (to: string) => navigate(to, { replace: true }),
      back: () => navigate(-1),
    }),
    [navigate],
  );
}
export function useSearchParams() {
  return new URLSearchParams(useLocation().search);
}
