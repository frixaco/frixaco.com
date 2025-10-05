export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <h3 className="text-cyber-grey">More about me</h3>
        <ul>
          <li>
            some favorite games: Sekiro, Monster Hunter World, Elden Ring, Lies
            of P and osu!
          </li>
          <li>like anime (270+) & manga</li>
          <li>
            self-taught dev, live inside my terminal, Neovim-er, embracing AI
            (before it "embraces" me)
          </li>
        </ul>
      </div>

      <div className="flex flex-col">
        <h3 className="text-cyber-grey">PC</h3>
        <ul>
          <li>CPU: AMD Ryzen 7 5800X</li>
          <li>GPU: AMD PowerColor RED DEVIL Radeon RX 9070 XT</li>
          <li>RAM: Crucial Ballistix 32GB 3600MHz DDR4 CL16</li>
          <li>Cooler: Arctic Liquid Freezer II 360</li>
          <li>Case: Lian Li O11 Vision Black</li>
          <li>SSD #1: </li>
          <li>SSD #2: </li>
          <li>Motherboard: B550 AORUS ELITE V2</li>
          <li>PSU: </li>
          <li>Intake fans: x3 XASTRA FS120B ARGB</li>
          <li>Exhaust fans: x3 XASTRA FS120B ARGB Reverse</li>
          <li>XPPen Updated Deco 01 V3</li>
          <li>Logitech G502 X Wired LIGHTFORCE</li>
          <li>ASUS TUF 27" 165Hz 1440P VG27AQ</li>
          <li>Logitech G502 X Wired LIGHTFORCE</li>
        </ul>
      </div>

      <div className="flex flex-col">
        <h3 className="text-cyber-grey">Laptop</h3>
        <ul>
          <li>M1 Macbook Air 14", 8GB RAM, 256GB SSD</li>
          <li>M2 Pro Macbook Pro 14", 16GB RAM, 512GB SSD (work)</li>
        </ul>
      </div>
    </div>
  );
}
