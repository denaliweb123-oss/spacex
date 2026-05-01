import { parseShip, parseLaunchpad } from '../../parse-service';

describe('Parse Service Unit Tests', () => {
  describe('parseShip', () => {
    it('correctly renames REST fields to GraphQL schema names', () => {
      const rawShip = {
        ship_id: 'GOMSCHIEF',
        ship_name: 'GO MS CHIEF',
        ship_model: 'Fairing Recovery',
        ship_type: 'High Speed Craft',
        active: true,
      };

      const parsed = parseShip(rawShip);

      expect(parsed.id).toBe('GOMSCHIEF');
      expect(parsed.name).toBe('GO MS CHIEF');
      expect(parsed.model).toBe('Fairing Recovery');
      expect(parsed.type).toBe('High Speed Craft');
      expect(parsed.active).toBe(true);
    });

    it('handles null or missing fields gracefully', () => {
      const parsed = parseShip({});
      expect(parsed.id).toBeUndefined();
      expect(parsed.name).toBeUndefined();
    });
  });

  describe('parseLaunchpad', () => {
    it('maps full_name to name and strips padid', () => {
      const rawPad = {
        full_name: 'Kennedy Space Center Historic Launch Complex 39A',
        status: 'active',
        padid: 123
      };

      const parsed = parseLaunchpad(rawPad);

      expect(parsed.name).toBe('Kennedy Space Center Historic Launch Complex 39A');
      expect(parsed.status).toBe('active');
      // Original keys should be absent if mapping is strict
      expect((parsed as any).full_name).toBeUndefined();
      expect((parsed as any).padid).toBeUndefined();
    });
  });
});