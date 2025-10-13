export default function Page() {
  return (
    <div className="flex flex-col gap-6 pt-6 pb-8">
      <div className="flex flex-col gap-6">
        <h3 className="text-cyber-fg">more about me</h3>
        <ul className="text-cyber-grey flex list-inside list-disc flex-col gap-2">
          <li>
            self-taught, live inside my terminal, Neovim btw, embracing AI
            (before it "embraces" me)
          </li>
          <li>
            some favorite games: Sekiro, Monster Hunter World, Elden Ring, Lies
            of P and osu!
          </li>
          <li>like watching anime (270+) & reading manga</li>
          <li>learning Blender</li>
          <li>learning Japanese</li>
          <li>learning music production</li>
        </ul>
      </div>

      <div className="flex flex-col gap-6">
        <h3 className="text-cyber-fg">pc</h3>
        <ul className="text-cyber-grey flex list-inside list-disc flex-col gap-2">
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

      <div className="flex flex-col gap-6">
        <h3 className="text-cyber-fg">laptop</h3>
        <ul className="text-cyber-grey flex list-inside list-disc flex-col gap-2">
          <li>M4 Pro Macbook Pro 14", 24GB RAM, 1TB SSD</li>
          <li>M2 Pro Macbook Pro 14", 16GB RAM, 512GB SSD (work)</li>
        </ul>
      </div>

      <div className="flex flex-col gap-6">
        <h3 className="text-cyber-fg">other</h3>
        <ul className="text-cyber-grey flex list-inside list-disc flex-col gap-2">
          <li>Realme GT Neo 2, 12GB RAM, 256GB storage, Snapdragon 870</li>
          <li>M4 iPad Pro 13", 256GB with Apple Pencil Pro</li>
        </ul>
      </div>
    </div>
  );
}
