import * as THREE from 'three';

export class TextureGenerator {
  /**
   * Generates a realistic gym hardwood floor texture with plank variations.
   */
  public static createGymFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base warm honey-oak gym floor tone
    ctx.fillStyle = '#b77d48';
    ctx.fillRect(0, 0, 1024, 1024);

    const plankHeight = 32;
    const numRows = 1024 / plankHeight;

    // Draw individual hardwood planks
    for (let r = 0; r < numRows; r++) {
      const y = r * plankHeight;
      // Staggered plank offsets
      const offset = (r % 3) * 180;
      let x = -offset;

      while (x < 1024) {
        const plankWidth = 140 + Math.sin(r * 13 + x) * 40;

        // Subtle tone variation between wood planks
        const toneVariation = Math.sin(r * 7.7 + x * 0.05) * 15;
        const rVal = Math.min(240, Math.max(160, Math.floor(190 + toneVariation)));
        const gVal = Math.min(210, Math.max(130, Math.floor(142 + toneVariation * 0.8)));
        const bVal = Math.min(150, Math.max(75, Math.floor(88 + toneVariation * 0.6)));

        ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
        ctx.fillRect(x + 1, y + 1, plankWidth - 2, plankHeight - 2);

        // Faint wood grain lines within each plank
        ctx.strokeStyle = `rgba(100, 50, 15, 0.07)`;
        ctx.lineWidth = 1;
        for (let g = 4; g < plankHeight - 4; g += 5) {
          ctx.beginPath();
          ctx.moveTo(x + 2, y + g);
          ctx.lineTo(x + plankWidth - 2, y + g);
          ctx.stroke();
        }

        // Plank seam
        ctx.strokeStyle = 'rgba(70, 35, 10, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plankWidth, plankHeight);

        x += plankWidth;
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 6);
    return texture;
  }

  /**
   * Generates the gymnasium back wall texture matching the reference image:
   * Cream upper wall, wooden lower wainscoting, door on left, wall bars on right.
   */
  public static createGymWallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // 1. Pale cream upper sports hall wall
    ctx.fillStyle = '#cdc5b4';
    ctx.fillRect(0, 0, 2048, 450);

    // Subtle horizontal wall panel lines
    ctx.strokeStyle = 'rgba(150, 140, 125, 0.3)';
    ctx.lineWidth = 2;
    for (let y = 50; y < 450; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();
    }

    // 2. Wooden lower wainscoting / paneling
    ctx.fillStyle = '#b3824f';
    ctx.fillRect(0, 450, 2048, 574);

    // Horizontal wooden slats on lower wall
    ctx.strokeStyle = 'rgba(90, 55, 20, 0.35)';
    ctx.lineWidth = 2;
    for (let y = 450; y < 1024; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();
    }

    // Wainscoting top trim rail
    ctx.fillStyle = '#7a4e25';
    ctx.fillRect(0, 444, 2048, 12);

    // Baseboard floor trim rail
    ctx.fillStyle = '#5c3614';
    ctx.fillRect(0, 1010, 2048, 14);

    // 3. Left Doorway (matching reference image)
    const doorX = 180;
    const doorY = 320;
    const doorW = 200;
    const doorH = 690;
    ctx.fillStyle = '#22252a'; // dark doorway frame
    ctx.fillRect(doorX - 6, doorY - 6, doorW + 12, doorH + 6);
    ctx.fillStyle = '#3a3f47'; // dark interior door
    ctx.fillRect(doorX, doorY, doorW, doorH);
    // Door glass pane
    ctx.fillStyle = '#728091';
    ctx.fillRect(doorX + 25, doorY + 30, doorW - 50, 180);

    // 4. Right Swedish Wall Bars / Gymnasium Ladder (matching reference image)
    const ladderX = 1580;
    const ladderY = 120;
    const ladderW = 320;
    const ladderH = 800;

    // Upright wooden beams
    ctx.fillStyle = '#8b592b';
    ctx.fillRect(ladderX, ladderY, 20, ladderH);
    ctx.fillRect(ladderX + ladderW / 2 - 10, ladderY, 20, ladderH);
    ctx.fillRect(ladderX + ladderW - 20, ladderY, 20, ladderH);

    // Horizontal rungs
    ctx.fillStyle = '#ad7842';
    for (let ry = ladderY + 30; ry < ladderY + ladderH; ry += 35) {
      ctx.fillRect(ladderX + 20, ry, ladderW / 2 - 30, 10);
      ctx.fillRect(ladderX + ladderW / 2 + 10, ry, ladderW / 2 - 30, 10);
      // Highlight on rungs
      ctx.fillStyle = 'rgba(255, 230, 180, 0.35)';
      ctx.fillRect(ladderX + 20, ry, ladderW - 40, 2);
      ctx.fillStyle = '#ad7842';
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates the royal purple table top texture with white boundary and center lines.
   */
  public static createTableTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; // corresponds to width 1.525m
    canvas.height = 2048; // corresponds to length 2.74m
    const ctx = canvas.getContext('2d')!;

    // Royal purple table surface matching reference image
    const gradient = ctx.createLinearGradient(0, 0, 1024, 2048);
    gradient.addColorStop(0, '#6d3ea7');
    gradient.addColorStop(0.5, '#7846b8');
    gradient.addColorStop(1, '#65379f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 2048);

    // Subtle table matte surface grain
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let i = 0; i < 4000; i++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 2048;
      ctx.fillRect(rx, ry, 2, 2);
    }

    // White outer border lines (2cm ITTF standard)
    // 2cm / 152.5cm * 1024px ~ 14px border
    const borderWidth = 14;
    ctx.fillStyle = '#ffffff';
    // Top & Bottom edges
    ctx.fillRect(0, 0, 1024, borderWidth);
    ctx.fillRect(0, 2048 - borderWidth, 1024, borderWidth);
    // Left & Right edges
    ctx.fillRect(0, 0, borderWidth, 2048);
    ctx.fillRect(1024 - borderWidth, 0, borderWidth, 2048);

    // White center line (3mm ITTF standard)
    // 3mm / 152.5cm * 1024px ~ 3px line down the middle
    ctx.fillRect(512 - 2, 0, 4, 2048);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates the net mesh texture with white top tape and transparent grid.
   */
  public static createNetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, 256, 128);

    // White top binding tape (top 15% of net)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 18);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 17, 256, 2);

    // Netting mesh pattern
    ctx.strokeStyle = 'rgba(40, 40, 40, 0.75)';
    ctx.lineWidth = 1.5;

    const spacing = 8;
    for (let x = 0; x < 256; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }

    for (let y = 18; y < 128; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(16, 1);
    return texture;
  }

  /**
   * Generates textured rubber sheet for paddle.
   */
  public static createPaddleRubberTexture(baseColorHex: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 256, 256);

    // Subtle rubber pimple texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let y = 0; y < 256; y += 4) {
      for (let x = 0; x < 256; x += 4) {
        ctx.fillRect(x + (y % 8 === 0 ? 2 : 0), y, 1.5, 1.5);
      }
    }

    return new THREE.CanvasTexture(canvas);
  }
}
