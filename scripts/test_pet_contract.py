#!/usr/bin/env python3
"""Regression tests for safe Codex pet packaging."""

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image

from setup_codex import PETS_DATA, PUBLIC_PETS_DIR, get_codex_dir, install_pet, validate_atlas, validate_v1_atlas
from upgrade_pets_to_v2 import upgrade_all_pets


class PetContractTests(unittest.TestCase):
    def test_bundled_v1_atlas_has_expected_frame_contract(self):
        image = validate_v1_atlas(PUBLIC_PETS_DIR / "furina.webp")
        self.assertEqual(image.size, (1536, 1872))

    def test_bundled_v2_atlas_has_expected_frame_contract(self):
        image = validate_atlas(PUBLIC_PETS_DIR / "hu-tao.webp", 2)
        self.assertEqual(image.size, (1536, 2288))

    def test_codex_home_override_is_respected(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"CODEX_HOME": directory}):
                self.assertEqual(get_codex_dir(), Path(directory))

    def test_automatic_v2_synthesis_is_disabled(self):
        with self.assertRaisesRegex(RuntimeError, "genuine gaze directions"):
            upgrade_all_pets()

    def test_installer_preserves_existing_package_without_force(self):
        with tempfile.TemporaryDirectory() as directory:
            codex_dir = Path(directory)
            result, backup = install_pet(PETS_DATA[1], codex_dir)
            self.assertEqual((result, backup), ("installed", None))
            manifest = (codex_dir / "pets/furina/pet.json").read_text()
            self.assertNotIn("spriteVersionNumber", manifest)
            with Image.open(codex_dir / "pets/furina/spritesheet.webp") as source:
                pixels = source.convert("RGBA").get_flattened_data()
            self.assertFalse(any(
                alpha == 0 and (red or green or blue)
                for red, green, blue, alpha in pixels
            ))

            marker = codex_dir / "pets/furina/user-file.txt"
            marker.write_text("preserve")
            result, backup = install_pet(PETS_DATA[1], codex_dir)
            self.assertEqual((result, backup), ("skipped", None))
            self.assertEqual(marker.read_text(), "preserve")

    def test_installer_writes_v2_manifest_for_v2_pet(self):
        with tempfile.TemporaryDirectory() as directory:
            codex_dir = Path(directory)
            result, backup = install_pet(PETS_DATA[0], codex_dir)
            self.assertEqual((result, backup), ("installed", None))
            manifest = (codex_dir / "pets/hu-tao/pet.json").read_text()
            self.assertIn('"spriteVersionNumber": 2', manifest)
            with Image.open(codex_dir / "pets/hu-tao/spritesheet.webp") as image:
                self.assertEqual(image.size, (1536, 2288))


if __name__ == "__main__":
    unittest.main()
