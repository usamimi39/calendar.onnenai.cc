import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { Container } from './Container'

type PageHeaderProps = {
  title: string
  description: string
}

// Figma: PageHeader。PC は上下 64・行間 12、スマホは上 32 / 下 24・行間 8
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <Container className="pt-8 pb-6 md:py-16">
      <VStack className="gap-2 md:gap-3">
        <Heading level={1}>{title}</Heading>
        <Text as="p" display="block" color="secondary">
          {description}
        </Text>
      </VStack>
    </Container>
  )
}
