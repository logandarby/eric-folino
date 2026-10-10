import { pageScript } from '../../app/router.ts';
import { mountBackLink } from '../../components/back-link/back-link.ts';

pageScript(import.meta.url, () => mountBackLink());
