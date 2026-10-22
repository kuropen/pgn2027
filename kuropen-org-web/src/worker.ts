import { handle } from '@astrojs/cloudflare/handler';
export { InquiryCoordinator } from './server/inquiry-coordinator';

export default { fetch: handle };
