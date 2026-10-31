"""Native procedural mesh world bounds guard: refuse editor-billboard-only levels."""
import importlib.util
import unittest
from pathlib import Path

path=Path(__file__).resolve().parents[1]/'visual-qa/sr1b_native_bounds.py'
spec=importlib.util.spec_from_file_location('sr1b_native_bounds',path)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class TestSourceWorldBounds(unittest.TestCase):
    def setUp(self):
        self.triangles=[((0.,0.,0.),(0.,1.,0.),(1.,0.,0.))]
        self.source=mod.source_bounds(self.triangles)

    def test_good_native_world_space_contains_source(self):
        self.assertTrue(mod.check_native_component_bounds(
            self.source,(0.,-65.,74.),(.5,-64.5,74.),(.5,.5,0.))[
                'boundsContainEverySourceFace'])

    def test_missing_geometry_empty_world_bounds_blocks(self):
        with self.assertRaisesRegex(ValueError,'world bounds are empty'):
            mod.check_native_component_bounds(
                self.source,(0.,-65.,74.),(0.,-65.,74.),(0.,0.,0.))

    def test_untransformed_native_scene_at_origin_blocks(self):
        with self.assertRaisesRegex(ValueError,'bounds exclude original source faces'):
            mod.check_native_component_bounds(
                self.source,(0.,-65.,74.),(.5,.5,0.),(.5,.5,0.))

    def test_far_away_native_scene_blocks(self):
        with self.assertRaisesRegex(ValueError,'bounds exclude original source faces'):
            mod.check_native_component_bounds(
                self.source,(0.,-65.,74.),(250.,300.,0.),(.5,.5,.5))

    def test_implausibly_huge_native_scene_bounds_block(self):
        with self.assertRaisesRegex(ValueError,'implausibly expanded'):
            mod.check_native_component_bounds(
                self.source,(0.,-65.,74.),(.5,-64.5,74.),(100.,100.,100.))

    def test_nonfinite_native_bounds_block(self):
        with self.assertRaisesRegex(ValueError,'Nonfinite native world bounds'):
            mod.check_native_component_bounds(
                self.source,(0.,-65.,74.),(float('nan'),-64.5,74.),(.5,.5,0.))

    def test_empty_or_degenerate_source_geometry_blocks(self):
        with self.assertRaises(ValueError):
            mod.source_bounds([])
        with self.assertRaisesRegex(ValueError,'collapsed'):
            mod.source_bounds([((1.,1.,1.),)*3])


if __name__=='__main__':unittest.main()
