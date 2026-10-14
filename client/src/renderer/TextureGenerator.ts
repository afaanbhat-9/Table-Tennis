import * as THREE from 'three';

export class TextureGenerator {
  /**
   * Generates a realistic gym hardwood parquet floor texture with plank variations and satin sheen.
   */
  public static createGymFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base warm honey-oak tone
    ctx.fillStyle = '#b77d48';
    ctx.fillRect(0, 0, 1024, 1024);

    const plankHeight = 32;
    const numRows = 1024 / plankHeight;

    for (let r = 0; r < numRows; r++) {
      const y = r * plankHeight;
      const offset = (r % 4) * 160;
      let x = -offset;

      while (x < 1024) {
        const plankWidth = 160 + Math.sin(r * 11 + x * 0.05) * 35;

        // Rich subtle wood tone variations
        const tone = Math.sin(r * 5.3 + x * 0.02) * 16;
        const rVal = Math.min(235, Math.max(165, Math.floor(196 + tone)));
        const gVal = Math.min(205, Math.max(135, Math.floor(146 + tone * 0.85)));
        const bVal = Math.min(145, Math.max(78, Math.floor(92 + tone * 0.65)));

        ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
        ctx.fillRect(x + 1, y + 1, plankWidth - 2, plankHeight - 2);

        // Realistic fine grain streaks within each plank
        ctx.strokeStyle = `rgba(110, 55, 18, 0.08)`;
        ctx.lineWidth = 1;
        for (let g = 5; g < plankHeight - 4; g += 6) {
          ctx.beginPath();
          ctx.moveTo(x + 2, y + g);
          ctx.lineTo(x + plankWidth - 2, y + g + (Math.sin(x) * 2));
          ctx.stroke();
        }

        // Dark plank seam
        ctx.strokeStyle = 'rgba(60, 30, 10, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, plankWidth, plankHeight);

        x += plankWidth;
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 7);
    return texture;
  }

  /**
   * Generates gymnasium arena back wall with cream upper wall, wood slats, door, and Swedish wall bars.
   */
  public static createGymWallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // 1. Pale cream upper sports hall wall
    ctx.fillStyle = '#cdc5b4';
    ctx.fillRect(0, 0, 2048, 450);

    // Architectural expansion joints
    ctx.strokeStyle = 'rgba(140, 130, 115, 0.25)';
    ctx.lineWidth = 2;
    for (let y = 50; y < 450; y += 65) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();
    }

    // 2. Wooden lower wainscoting
    ctx.fillStyle = '#b3824f';
    ctx.fillRect(0, 450, 2048, 574);

    // Horizontal wooden slats
    ctx.strokeStyle = 'rgba(85, 50, 18, 0.4)';
    ctx.lineWidth = 2;
    for (let y = 450; y < 1024; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();
      // Highlight on top of each slat
      ctx.fillStyle = 'rgba(255, 235, 195, 0.12)';
      ctx.fillRect(0, y + 2, 2048, 2);
    }

    // Solid hardwood top chair-rail trim
    ctx.fillStyle = '#7a4e25';
    ctx.fillRect(0, 442, 2048, 14);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, 456, 2048, 4);

    // Baseboard floor trim
    ctx.fillStyle = '#553012';
    ctx.fillRect(0, 1008, 2048, 16);

    // 3. Hallway Door (Left)
    const doorX = 180;
    const doorY = 320;
    const doorW = 200;
    const doorH = 690;
    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(doorX - 8, doorY - 8, doorW + 16, doorH + 8);
    ctx.fillStyle = '#343942';
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = '#5c6b7d';
    ctx.fillRect(doorX + 25, doorY + 30, doorW - 50, 190);
    // Door handle
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(doorX + doorW - 30, doorY + 340, 18, 6);

    // 4. Swedish Gym Wall Bars / Ladder (Right)
    const ladderX = 1580;
    const ladderY = 110;
    const ladderW = 340;
    const ladderH = 820;

    // Upright beams with shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(ladderX - 4, ladderY, 28, ladderH);
    ctx.fillRect(ladderX + ladderW / 2 - 14, ladderY, 28, ladderH);
    ctx.fillRect(ladderX + ladderW - 24, ladderY, 28, ladderH);

    ctx.fillStyle = '#855428';
    ctx.fillRect(ladderX, ladderY, 22, ladderH);
    ctx.fillRect(ladderX + ladderW / 2 - 11, ladderY, 22, ladderH);
    ctx.fillRect(ladderX + ladderW - 22, ladderY, 22, ladderH);

    // Horizontal rungs
    ctx.fillStyle = '#ad7842';
    for (let ry = ladderY + 30; ry < ladderY + ladderH; ry += 35) {
      // Cast shadow under rungs
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(ladderX + 22, ry + 12, ladderW - 44, 4);

      ctx.fillStyle = '#ad7842';
      ctx.fillRect(ladderX + 22, ry, ladderW / 2 - 33, 12);
      ctx.fillRect(ladderX + ladderW / 2 + 11, ry, ladderW / 2 - 33, 12);

      // Warm highlight on top of rung
      ctx.fillStyle = 'rgba(255, 235, 190, 0.4)';
      ctx.fillRect(ladderX + 22, ry, ladderW / 2 - 33, 3);
      ctx.fillRect(ladderX + ladderW / 2 + 11, ry, ladderW / 2 - 33, 3);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates vibrant ITTF royal purple table texture with crisp white boundary lines.
   */
  public static createTableTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d')!;

    // Royal competition purple gradient
    const gradient = ctx.createLinearGradient(0, 0, 1024, 2048);
    gradient.addColorStop(0, '#663399');
    gradient.addColorStop(0.5, '#733aab');
    gradient.addColorStop(1, '#5f2e8f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 2048);

    // Subtle satin micro-texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let i = 0; i < 6000; i++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 2048;
      ctx.fillRect(rx, ry, 1.5, 1.5);
    }

    // Outer white boundary lines (20mm ITTF standard)
    const borderWidth = 14;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, borderWidth);
    ctx.fillRect(0, 2048 - borderWidth, 1024, borderWidth);
    ctx.fillRect(0, 0, borderWidth, 2048);
    ctx.fillRect(1024 - borderWidth, 0, borderWidth, 2048);

    // Center white line (3mm ITTF standard)
    ctx.fillRect(512 - 2, 0, 4, 2048);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates fine woven netting texture with white top binding tape.
   */
  public static createNetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 128);

    // White top binding tape
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 18);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 16, 256, 2);

    // Fine woven dark mesh
    ctx.strokeStyle = 'rgba(35, 35, 35, 0.85)';
    ctx.lineWidth = 1.2;

    const spacing = 7;
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
    texture.repeat.set(18, 1);
    return texture;
  }

  /**
   * Generates paddle rubber texture with micro-grip stippling.
   */
  public static createPaddleRubberTexture(baseColorHex: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 256, 256);

    // Micro-stipple rubber tackiness
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let y = 0; y < 256; y += 4) {
      for (let x = 0; x < 256; x += 4) {
        ctx.fillRect(x + (y % 8 === 0 ? 2 : 0), y, 1.5, 1.5);
      }
    }

    return new THREE.CanvasTexture(canvas);
  }
}
