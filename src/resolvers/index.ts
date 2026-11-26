import Resolver from '@forge/resolver';

import { register as registerIssueResolvers } from './issueResolver';
import { register as registerSprintResolvers } from './sprintResolver';
import { register as registerDemoResolvers } from './demoResolver';

// ─── Single shared resolver instance ─────────────────────────────────────────

const resolver = new Resolver();

registerIssueResolvers(resolver);
registerSprintResolvers(resolver);
registerDemoResolvers(resolver);

// ─── Exported handler (referenced by manifest: index.handler) ─────────────────

export const handler = resolver.getDefinitions();
