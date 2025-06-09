import { VioletButton } from "@/components/custom/violet-button"

export default function Page() {
  return (
      <>
          <section className={"w-full h-screen flex flex-col items-center justify-center"}>
              <h1>
                  Welcome to Quizify
              </h1>
              <p>
                  Your AI powered ✨ quiz generator application.
              </p>
              <VioletButton variant={"threed"} size={"lg"}>
                  Get Started
              </VioletButton>
          </section>
      </>
    )
}
