import unittest
from unittest.mock import patch
from game_engine import Roll, FixedRoll, RollResult

class TestRoll(unittest.TestCase):
    def test_crit(self):
        """Test that rolling a 20 results in CRIT and 0.05 probability."""
        roll = Roll()
        with patch('random.randint', return_value=20):
            res = roll.roll(bonus=0, difficulty=10)
            self.assertEqual(res, RollResult.CRIT)
            self.assertEqual(roll.last_probability, 0.05)

    def test_miss_nat1(self):
        """Test that rolling a 1 results in MISS, even if bonus is high."""
        roll = Roll()
        with patch('random.randint', return_value=1):
            # Threshold = 0 - 100 = -100.
            # Hits in [2, 19] (all 18). P(Hit) = 0.9. P(Crit) = 0.05.
            # P(Miss) = 0.05.
            res = roll.roll(bonus=100, difficulty=0)
            self.assertEqual(res, RollResult.MISS)
            self.assertAlmostEqual(roll.last_probability, 0.05)

    def test_hit_normal(self):
        """Test a normal hit."""
        roll = Roll()
        # Threshold = 10 - 2 = 8.
        # Roll 8 -> Hit.
        with patch('random.randint', return_value=8):
            res = roll.roll(bonus=2, difficulty=10)
            self.assertEqual(res, RollResult.HIT)
            # Hits in [8, 19]. Count = 12. P(Hit) = 0.6.
            self.assertAlmostEqual(roll.last_probability, 0.6)

    def test_miss_normal(self):
        """Test a normal miss."""
        roll = Roll()
        # Threshold = 10 - 2 = 8.
        # Roll 7 -> Miss.
        with patch('random.randint', return_value=7):
            res = roll.roll(bonus=2, difficulty=10)
            self.assertEqual(res, RollResult.MISS)
            # Hits in [8, 19]. Count = 12. P(Hit) = 0.6. P(Crit) = 0.05.
            # P(Miss) = 1 - 0.65 = 0.35.
            self.assertAlmostEqual(roll.last_probability, 0.35)

    def test_impossible_hit(self):
        """Test when threshold is too high (e.g. > 19)."""
        roll = Roll()
        # Threshold = 30 - 0 = 30.
        # Hits in [30, 19] -> Empty. P(Hit) = 0.
        with patch('random.randint', return_value=19):
            res = roll.roll(bonus=0, difficulty=30)
            self.assertEqual(res, RollResult.MISS)
            # P(Miss) = 0.95 (since Crit is always possible)
            self.assertAlmostEqual(roll.last_probability, 0.95)

    def test_guaranteed_hit_except_1(self):
        """Test when threshold is low (e.g. <= 2)."""
        roll = Roll()
        # Threshold = 0 - 0 = 0.
        # Hits in [2, 19]. Count = 18. P(Hit) = 0.9.
        with patch('random.randint', return_value=2):
            res = roll.roll(bonus=0, difficulty=0)
            self.assertEqual(res, RollResult.HIT)
            self.assertAlmostEqual(roll.last_probability, 0.9)

class TestFixedRoll(unittest.TestCase):
    def test_fixed_hit(self):
        fixed = FixedRoll(RollResult.HIT)
        # Threshold = 10 - 5 = 5.
        # Hits in [5, 19]. Count = 15. P(Hit) = 0.75.
        res = fixed.roll(bonus=5, difficulty=10)
        self.assertEqual(res, RollResult.HIT)
        self.assertAlmostEqual(fixed.last_probability, 0.75)

    def test_fixed_crit(self):
        fixed = FixedRoll(RollResult.CRIT)
        res = fixed.roll(bonus=0, difficulty=10)
        self.assertEqual(res, RollResult.CRIT)
        self.assertEqual(fixed.last_probability, 0.05)

    def test_fixed_miss(self):
        fixed = FixedRoll(RollResult.MISS)
        # Threshold = 20 - 0 = 20.
        # Hits in [20, 19] -> Empty. P(Hit) = 0.
        # P(Miss) = 0.95.
        res = fixed.roll(bonus=0, difficulty=20)
        self.assertEqual(res, RollResult.MISS)
        self.assertAlmostEqual(fixed.last_probability, 0.95)

if __name__ == '__main__':
    unittest.main()
