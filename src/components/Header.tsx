import { HStack } from '@astryxdesign/core/HStack'
import { Link } from '@astryxdesign/core/Link'
import { Text } from '@astryxdesign/core/Text'
import { site } from '../content/site'
import { Container } from './Container'
import { ThemeToggle } from './ThemeToggle'

// Figma: Header（Classic、ナビ非表示）と Header/Mobile（メニューボタン非表示）。
// PC はサイト名を 20px 太字、md 未満は text/label。右端はテーマ切替だけ
export function Header() {
  return (
    <header className="border-b border-border bg-body">
      <Container>
        <HStack justify="between" align="center" className="py-3 md:py-4">
          <Link href="/" color="primary" className="no-underline">
            <Text type="label" color="inherit" className="md:hidden">
              {site.name}
            </Text>
            <Text
              size="xl"
              weight="bold"
              color="inherit"
              className="hidden md:inline"
            >
              {site.name}
            </Text>
          </Link>
          <ThemeToggle className="border border-border" />
        </HStack>
      </Container>
    </header>
  )
}
