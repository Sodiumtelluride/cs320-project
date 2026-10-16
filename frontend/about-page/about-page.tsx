import { Globe2, Leaf, Users } from "lucide-react";

const values = [
  { icon: Leaf, title: "Fresh & thoughtful", description: "Freshly prepared food with local ingredients and sustainable choices." },
  { icon: Globe2, title: "A world of flavor", description: "Everyday favorites and global dishes, all across campus." },
  { icon: Users, title: "Better together", description: "A welcoming place to catch up with friends and share a meal." },
];

export function AboutPage() {
  return (
    <>
        <section aria-labelledby="about-title" className="max-w-3xl">
          <p className="mb-5 text-xs font-semibold tracking-[0.18em] text-primary">ABOUT UMASS AMHERST DINING</p>
          <h1 id="about-title" className="text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">Good food.<br /><span className="text-primary">Great company.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Fresh meals, familiar favorites, and flavors from around the world. A place to eat well and feel at home on campus.</p>
        </section>

        <section aria-labelledby="community-title" className="mt-14 border-t pt-10 sm:mt-16 sm:pt-12">
          <div className="grid gap-5 sm:grid-cols-[1fr_1.6fr] sm:gap-12">
            <h2 id="community-title" className="text-2xl font-semibold tracking-tight">More than a meal.</h2>
            <p className="max-w-xl leading-relaxed text-muted-foreground">From the four residential dining commons to cafés and eateries across campus, UMass Dining brings people together. Our approach is simple: delicious food, thoughtful ingredients, and a welcoming seat at the table.</p>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {values.map(({ icon: Icon, title, description }) => (
              <div key={title}>
                <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>
    </>
  );
}
