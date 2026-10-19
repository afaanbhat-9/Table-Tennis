import * as THREE from 'three';

export class TextureGenerator {
  /**
   * Generates warm anime school gymnasium wooden plank flooring with golden varnish and subtle grain.
   */
  public static createTournamentFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // 1. Warm honey-oak golden base
    const baseGrad = ctx.createRadialGradient(512, 512, 100, 512, 512, 680);
    baseGrad.addColorStop(0, '#e8be88'); // warm sunlit center
    baseGrad.addColorStop(0.5, '#d6a36c');
    baseGrad.addColorStop(0.85, '#bf8953');
    baseGrad.addColorStop(1, '#a6713d'); // warm edge
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Parallel wooden planks running vertically towards the court
    const plankWidth = 32;
    for (let x = 0; x < 1024; x += plankWidth) {
      // Subtle tonal variation per plank
      const tint = ((x * 17) % 7) - 3;
      ctx.fillStyle = tint > 0 ? `rgba(255, 255, 255, ${0.04 + tint * 0.015})` : `rgba(70, 36, 12, ${0.04 - tint * 0.015})`;
      ctx.fillRect(x, 0, plankWidth, 1024);

      // Plank groove lines
      ctx.fillStyle = 'rgba(78, 42, 16, 0.45)';
      ctx.fillRect(x, 0, 1.6, 1024);

      // Wood grain lines within plank
      ctx.strokeStyle = 'rgba(110, 60, 24, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 10, 0);
      ctx.bezierCurveTo(x + 14, 300, x + 8, 700, x + 12, 1024);
      ctx.stroke();

      // Staggered butt joints
      const jointY = ((x * 137) % 800) + 100;
      ctx.fillStyle = 'rgba(78, 42, 16, 0.55)';
      ctx.fillRect(x, jointY, plankWidth, 1.8);
    }

    // 3. Crisp white anime court perimeter line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(90, 80, 844, 864);

    // Center divider court line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(90, 512);
    ctx.lineTo(934, 512);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  /**
   * Generates authentic table tennis gymnasium back wall texture:
   * Upper architectural sports hall wall with clerestory windows, wall clock, and championship plaque,
   * lower honey-oak wainscoting with wood moulding, equipment doorway, and Swedish wall bars,
   * precisely proportioned for the in-game perspective camera.
   */
  public static createGymWallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const wainscotY = 815; // boundary between upper cream wall and lower wood wainscoting

    // 1. Upper Wall (y: 0 to wainscotY) - Soft warm cream architectural gym wall
    const upperGrad = ctx.createLinearGradient(0, 0, 0, wainscotY);
    upperGrad.addColorStop(0, '#ded6c6');
    upperGrad.addColorStop(0.4, '#e7dfcf');
    upperGrad.addColorStop(0.8, '#ede6d8');
    upperGrad.addColorStop(1, '#ebe4d5');
    ctx.fillStyle = upperGrad;
    ctx.fillRect(0, 0, 2048, wainscotY);

    // Architectural acoustic wall panel seams
    for (let y = 80; y < wainscotY - 10; y += 55) {
      ctx.strokeStyle = 'rgba(145, 132, 118, 0.30)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();

      // Soft highlight beneath seam
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, y + 1.8);
      ctx.lineTo(2048, y + 1.8);
      ctx.stroke();
    }

    // Vertical modular panel joints
    ctx.strokeStyle = 'rgba(145, 132, 118, 0.20)';
    ctx.lineWidth = 1.5;
    for (let x = 256; x < 2048; x += 256) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, wainscotY);
      ctx.stroke();
    }

    // High Clerestory / Transom Sports Hall Window Bank (y: 430 to 520)
    const winY = 430;
    const winH = 80;
    const winModules = 8;
    const moduleW = 200;
    const startX = 140;

    for (let m = 0; m < winModules; m++) {
      const mx = startX + m * (moduleW + 26);
      if (mx + moduleW > 1950) break;

      // Dark window outer frame
      ctx.fillStyle = '#26282d';
      ctx.fillRect(mx - 4, winY - 4, moduleW + 8, winH + 8);

      // Window panes (2x2 grid per module)
      const paneW = (moduleW - 10) / 2;
      const paneH = (winH - 10) / 2;

      for (let py = 0; py < 2; py++) {
        for (let px = 0; px < 2; px++) {
          const pxPos = mx + 4 + px * (paneW + 2);
          const pyPos = winY + 4 + py * (paneH + 2);

          // Soft frosted daylight pane with diffused sky-daylight gradient
          const paneGrad = ctx.createLinearGradient(pxPos, pyPos, pxPos, pyPos + paneH);
          paneGrad.addColorStop(0, '#f2f8fc');
          paneGrad.addColorStop(0.5, '#e4eff7');
          paneGrad.addColorStop(1, '#d8e7f2');
          ctx.fillStyle = paneGrad;
          ctx.fillRect(pxPos, pyPos, paneW, paneH);

          // Subtle sun sheen reflection
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.fillRect(pxPos + 3, pyPos + 3, paneW - 6, 4);
        }
      }
    }

    // Clean architectural wall behind court (banner and clock omitted for optimal ball & paddle visibility)

    // 2. Lower Wall (y: wainscotY to 1024) - Warm Honey-Oak Wainscoting Wood Paneling
    const woodGrad = ctx.createLinearGradient(0, wainscotY, 0, 1024);
    woodGrad.addColorStop(0, '#a5733f');
    woodGrad.addColorStop(0.3, '#b7834e');
    woodGrad.addColorStop(0.7, '#a97642');
    woodGrad.addColorStop(1, '#976433');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, wainscotY, 2048, 1024 - wainscotY);

    // Horizontal wooden tongue-and-groove slats
    for (let y = wainscotY + 16; y < 995; y += 18) {
      // Wood slat highlight
      ctx.fillStyle = 'rgba(255, 238, 205, 0.22)';
      ctx.fillRect(0, y, 2048, 1.8);

      // Wood slat groove shadow
      ctx.fillStyle = 'rgba(64, 34, 12, 0.45)';
      ctx.fillRect(0, y + 16, 2048, 2);

      // Subtle natural grain variations
      ctx.fillStyle = 'rgba(80, 42, 14, 0.08)';
      for (let g = 0; g < 2048; g += 90) {
        ctx.fillRect(g + ((y * 7) % 60), y + 3, 45, 10);
      }
    }

    // Dark solid walnut dado rail moulding dividing upper and lower sections
    ctx.fillStyle = '#542e12';
    ctx.fillRect(0, wainscotY - 10, 2048, 16);
    ctx.fillStyle = 'rgba(255, 225, 175, 0.4)';
    ctx.fillRect(0, wainscotY - 10, 2048, 2.5); // top bevel highlight
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, wainscotY + 5, 2048, 2); // bottom drop shadow

    // Dark solid timber baseboard at bottom
    ctx.fillStyle = '#3c1e0a';
    ctx.fillRect(0, 995, 2048, 29);
    ctx.fillStyle = 'rgba(255, 220, 170, 0.25)';
    ctx.fillRect(0, 995, 2048, 2.5);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates seamless gymnasium side wall texture:
   * Cream upper acoustic wall panels and lower warm honey-oak wood wainscoting.
   */
  public static createGymSideWallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const wainscotY = 815;

    // 1. Upper Wall (y: 0 to wainscotY)
    const upperGrad = ctx.createLinearGradient(0, 0, 0, wainscotY);
    upperGrad.addColorStop(0, '#ded6c6');
    upperGrad.addColorStop(0.4, '#e7dfcf');
    upperGrad.addColorStop(0.8, '#ede6d8');
    upperGrad.addColorStop(1, '#ebe4d5');
    ctx.fillStyle = upperGrad;
    ctx.fillRect(0, 0, 1024, wainscotY);

    // Horizontal acoustic panel seams
    for (let y = 80; y < wainscotY - 10; y += 55) {
      ctx.strokeStyle = 'rgba(145, 132, 118, 0.30)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, y + 1.8);
      ctx.lineTo(1024, y + 1.8);
      ctx.stroke();
    }

    // Vertical joints every 256px
    ctx.strokeStyle = 'rgba(145, 132, 118, 0.20)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x <= 1024; x += 256) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, wainscotY);
      ctx.stroke();
    }

    // 2. Lower Wall (y: wainscotY to 1024) - Honey-oak wainscoting
    const woodGrad = ctx.createLinearGradient(0, wainscotY, 0, 1024);
    woodGrad.addColorStop(0, '#a5733f');
    woodGrad.addColorStop(0.3, '#b7834e');
    woodGrad.addColorStop(0.7, '#a97642');
    woodGrad.addColorStop(1, '#976433');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, wainscotY, 1024, 1024 - wainscotY);

    for (let y = wainscotY + 16; y < 995; y += 18) {
      ctx.fillStyle = 'rgba(255, 238, 205, 0.22)';
      ctx.fillRect(0, y, 1024, 1.8);
      ctx.fillStyle = 'rgba(64, 34, 12, 0.45)';
      ctx.fillRect(0, y + 16, 1024, 2);
    }

    // Dado rail moulding
    ctx.fillStyle = '#542e12';
    ctx.fillRect(0, wainscotY - 10, 1024, 16);
    ctx.fillStyle = 'rgba(255, 225, 175, 0.4)';
    ctx.fillRect(0, wainscotY - 10, 1024, 2.5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, wainscotY + 5, 1024, 2);

    // Baseboard
    ctx.fillStyle = '#3c1e0a';
    ctx.fillRect(0, 995, 1024, 29);
    ctx.fillStyle = 'rgba(255, 220, 170, 0.25)';
    ctx.fillRect(0, 995, 1024, 2.5);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(3, 1);
    return texture;
  }

  /**
   * Generates clean anime gymnasium court barrier texture (deep anime navy fabric with white athletic stripe).
   */
  public static createBarrierTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 340;
    const ctx = canvas.getContext('2d')!;

    // Rich anime navy canvas
    const bg = ctx.createLinearGradient(0, 0, 0, 340);
    bg.addColorStop(0, '#1a2e45');
    bg.addColorStop(0.5, '#1e3a5f');
    bg.addColorStop(1, '#16283d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 340);

    // Clean white athletic stripe across middle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(0, 160, 1024, 12);

    // Top and bottom protective edge piping
    ctx.fillStyle = '#2c476e';
    ctx.fillRect(0, 0, 1024, 6);
    ctx.fillStyle = '#111d2b';
    ctx.fillRect(0, 334, 1024, 6);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Generates professional tournament teal/cyan table texture with crisp white boundary lines,
   * exactly matching the reference image.
   */
  public static createTableTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d')!;

    // Reference image ocean teal / dark cyan gradient with central spotlight sheen
    const gradient = ctx.createRadialGradient(512, 1024, 120, 512, 1024, 1100);
    gradient.addColorStop(0, '#166978'); // rich tournament teal center
    gradient.addColorStop(0.55, '#125664');
    gradient.addColorStop(0.85, '#0e4550');
    gradient.addColorStop(1, '#0a3640'); // deep edge vignette
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 2048);

    // Ultra-fine satin tournament micro-texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    for (let i = 0; i < 9000; i++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 2048;
      ctx.fillRect(rx, ry, 1.2, 1.2);
    }

    // Outer white boundary lines (crisp 20mm standard, 16px wide)
    const borderWidth = 16;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, borderWidth);
    ctx.fillRect(0, 2048 - borderWidth, 1024, borderWidth);
    ctx.fillRect(0, 0, borderWidth, 2048);
    ctx.fillRect(1024 - borderWidth, 0, borderWidth, 2048);

    // Center white division line (crisp 3mm standard, 4px wide)
    ctx.fillRect(512 - 2, 0, 4, 2048);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Generates fine woven netting texture with crisp white top binding tape.
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, 16, 256, 2);

    // Fine woven dark mesh
    ctx.strokeStyle = 'rgba(18, 22, 30, 0.92)';
    ctx.lineWidth = 1.3;

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
   * Generates competition crimson red paddle rubber texture with ITTF stamp.
   */
  public static createPaddleRubberTexture(baseColorHex: string, isPlayer: boolean = true): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Rich tournament crimson red gradient matching reference
    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 260);
    if (isPlayer) {
      grad.addColorStop(0, '#d12828'); // rich bright red center highlight
      grad.addColorStop(0.55, '#b71c1c');
      grad.addColorStop(0.85, '#9a1313');
      grad.addColorStop(1, '#831010');
    } else {
      grad.addColorStop(0, '#1c1f26'); // black rubber for opponent
      grad.addColorStop(0.7, '#14161b');
      grad.addColorStop(1, '#0e0f12');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Micro-stipple rubber tackiness
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let y = 0; y < 512; y += 4) {
      for (let x = 0; x < 512; x += 4) {
        ctx.fillRect(x + (y % 8 === 0 ? 2 : 0), y, 1.4, 1.4);
      }
    }

    // Subtle embossed ITTF emblem stamp at bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ITTF 3-STAR CHAMPIONSHIP', 256, 472);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Generates pure white competition 3-star ball texture with dark ITTF stamp, matching reference.
   */
  public static createBallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Pure matte competition white (not yellow)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 256);

    // Subtle dark navy ITTF 3-Star Stamp
    ctx.fillStyle = '#1c2838';
    ctx.textAlign = 'center';

    // 3 Stars: ★ ★ ★
    ctx.font = 'bold 22px Arial';
    ctx.fillText('★ ★ ★', 256, 104);

    // 40+
    ctx.font = '900 30px "Segoe UI", Arial, sans-serif';
    ctx.fillText('40+', 256, 138);

    // PRO SEAMLESS
    ctx.font = '800 13px "Segoe UI", Arial, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('SEAMLESS ITTF', 256, 162);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Generates natural carved hardwood handle texture matching reference.
   */
  public static createHandleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Rich warm walnut wood base tone
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, 0, 256, 256);

    // Natural woodgrain flow
    ctx.strokeStyle = 'rgba(40, 22, 10, 0.45)';
    ctx.lineWidth = 1.6;
    for (let x = 0; x < 256; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + Math.sin(x * 0.1) * 6, 80, x - Math.cos(x * 0.1) * 6, 180, x, 256);
      ctx.stroke();
    }

    // Warm birch core accent strip
    ctx.fillStyle = '#8b5a36';
    ctx.fillRect(96, 0, 24, 256);
    ctx.fillRect(136, 0, 24, 256);

    // Thin darker boundary pinstripe
    ctx.fillStyle = '#341d0e';
    ctx.fillRect(94, 0, 2, 256);
    ctx.fillRect(120, 0, 2, 256);
    ctx.fillRect(134, 0, 2, 256);
    ctx.fillRect(160, 0, 2, 256);

    return new THREE.CanvasTexture(canvas);
  }
}
