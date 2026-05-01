import API from '../api';
import { SpaceXService } from '../services/SpaceXService';

/**
 * Context passed to every resolver.
 */
export interface DataSourceContext {
  api: API;
  spacexService: SpaceXService;
  // Other context properties (auth, ip, etc.)
}