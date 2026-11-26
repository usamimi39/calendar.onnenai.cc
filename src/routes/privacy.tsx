import { Fragment } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Heading } from '@astryxdesign/core/Heading'
import { Link } from '@astryxdesign/core/Link'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { Container } from '../components/Container'
import { PageHeader } from '../components/PageHeader'
import { privacyText, site } from '../content/site'
import type { Inline } from '../content/site'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: `${privacyText.title} | ${site.name}` }] }),
  component: PrivacyPage,
})

// Figma に画面は無い。トップと同じ PageHeader と、見出し（h2）+ 本文だけで組む
function PrivacyPage() {
  return (
    <>
      <PageHeader
        title={privacyText.title}
        description={privacyText.description}
      />
      <Container className="pb-12 md:pb-16">
        <VStack gap={8} className="max-w-content">
          {privacyText.sections.map((section) => (
            <VStack as="section" key={section.heading} gap={2}>
              <Heading level={2}>{section.heading}</Heading>
              {section.paragraphs.map((paragraph, i) => (
                <Text as="p" display="block" key={i}>
                  {paragraph.map((part, j) => (
                    <InlinePart key={j} part={part} />
                  ))}
                </Text>
              ))}
            </VStack>
          ))}
          <Text type="supporting" display="block">
            {privacyText.updated}
          </Text>
        </VStack>
      </Container>
    </>
  )
}

function InlinePart({ part }: { part: Inline }) {
  if (typeof part === 'string') return <Fragment>{part}</Fragment>
  return (
    <Link
      href={part.href}
      target="_blank"
      type="inherit"
      // Astryx の Link は inline-flex（中の文字は block）で、長いリンクが文の途中で塊ごと改行されるため、文中では文字として流す
      className="inline *:inline"
    >
      {part.label}
      <span className="sr-only">{site.newTabLabel}</span>
    </Link>
  )
}
