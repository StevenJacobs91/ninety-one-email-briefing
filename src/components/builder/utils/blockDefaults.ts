import type { Block, BlockType } from '../types'

export function createBlock(type: BlockType, moduleId?: string): Block {
  const id = crypto.randomUUID()

  switch (type) {
    case 'hero':
      return {
        id,
        type: 'hero',
        props: {
          bgColor: '#134848',
          bgImageUrl: '',
          overlayOpacity: 0.4,
          logoVisible: true,
          heading: 'Your headline here',
          subheading: 'Supporting text that complements your headline and drives action.',
          alignment: 'center',
          paddingY: 48,
        },
      }

    case 'text':
      return {
        id,
        type: 'text',
        props: {
          html: '<p>Your email body text goes here. Edit inline or use the settings panel.</p>',
          paddingX: 32,
          paddingY: 24,
          alignment: 'left',
          bgColor: '#ffffff',
        },
      }

    case 'image':
      return {
        id,
        type: 'image',
        props: {
          src: '',
          alt: '',
          link: '',
          width: 100,
          alignment: 'center',
          paddingY: 0,
        },
      }

    case 'button':
      return {
        id,
        type: 'button',
        props: {
          label: 'Read More',
          url: '#',
          bgColor: '#fbaa96',
          textColor: '#134848',
          borderRadius: 4,
          paddingX: 32,
          paddingY: 14,
          alignment: 'center',
          blockPaddingY: 24,
        },
      }

    case 'columns':
      return {
        id,
        type: 'columns',
        props: {
          columnCount: 2,
          gap: 16,
          bgColor: '#ffffff',
          paddingY: 16,
          columns: [{ blocks: [] }, { blocks: [] }],
        },
      }

    case 'spacer':
      return {
        id,
        type: 'spacer',
        props: {
          height: 32,
          bgColor: 'transparent',
        },
      }

    case 'divider':
      return {
        id,
        type: 'divider',
        props: {
          color: '#e5e7eb',
          thickness: 1,
          paddingY: 16,
          bgColor: 'transparent',
          style: 'solid',
        },
      }

    case 'social':
      return {
        id,
        type: 'social',
        props: {
          platforms: ['linkedin', 'twitter'],
          iconStyle: 'filled',
          iconColor: '#134848',
          bgColor: '#ffffff',
          paddingY: 24,
          alignment: 'center',
        },
      }

    case 'module':
      return {
        id,
        type: 'module',
        props: {
          moduleId: moduleId ?? 'body-content',
          notes: '',
          bgColor: '#ffffff',
        },
      }
  }
}
