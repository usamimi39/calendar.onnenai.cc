import { HeadContent, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { LinkProvider } from '@astryxdesign/core/Link'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { NotFound } from '../components/NotFound'
import { RouterLink } from '../components/RouterLink'
import { site } from '../content/site'

export const Route = createRootRoute({
  head: () => ({ meta: [{ title: site.name }] }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <LinkProvider component={RouterLink}>
      <HeadContent />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </LinkProvider>
  )
}
