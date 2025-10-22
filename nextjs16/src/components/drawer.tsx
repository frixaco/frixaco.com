import { cn } from "@/lib/utils";

export function Drawer({ isOpen }: { isOpen: boolean }) {
  return (
    <>
      <div
        className={
          "absolute inset-x-0 bottom-0 z-10 flex will-change-transform flex-col items-center overflow-hidden bg-cyber-grey pt-16 shadow-2xl duration-400 ease-[cubic-bezier(0.25,0.8,0.25,1)] rounded-none top-100"
        }
        style={{
          transform: isOpen
            ? "translate(0, 0) scale(1)"
            : // TODO:: is this better than translate(0%, 100%)?
              "translate(0%, 100%) scale(0.90)",
        }}
      >
        <div className="w-1/2 h-full contain-layout">
          <p>
            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Pariatur
            minus expedita error iste ad consequatur. Aspernatur esse, pariatur
            est laboriosam quo enim dignissimos eligendi sunt dolorum doloribus
            error quasi praesentium dicta numquam provident corrupti magnam modi
            itaque! Architecto enim dolores incidunt quasi iusto, at rem ab esse
            nobis similique iste quo a saepe mollitia cum deleniti! Modi
            recusandae voluptatibus earum, id saepe porro cumque consequatur.
            Nemo, quae iusto. Saepe voluptatem enim vero maiores fugiat
            obcaecati reiciendis esse iusto, nobis molestias quidem eveniet,
            earum quae explicabo ea dolorem sed voluptates. Aperiam perferendis
            ipsam neque quidem perspiciatis ab ullam accusantium debitis odit.
          </p>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-150 ease-out",
          {
            "pointer-events-none backdrop-blur-none": !isOpen,
            "backdrop-blur-xs": isOpen,
          }
        )}
      />
    </>
  );
}
