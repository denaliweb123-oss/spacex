import { parseShip, parseLaunchpad } from '../parse-service';

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

    it('reconciles weight_lbs based on weight_kg (Scenario 7)', () => {
      const rawShip = {
        weight_kg: 100,
        weight_lbs: 500, // Inconsistent input
      };
      const parsed = parseShip(rawShip);
      expect(parsed.weight_lbs).toBe(220); // Math.round(100 * 2.20462262)
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