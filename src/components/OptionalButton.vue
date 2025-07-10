<script setup lang="ts">
import { Size } from 'naive-ui/es/button/src/interface';

withDefaults(defineProps<{ disabled?: boolean; round?: boolean; size?: Size }>(), {});

const emit = defineEmits<{ click: [ev: MouseEvent] }>();
</script>

<template>
  <div class="optional-button">
    <n-button-group class="button-group">
      <n-button
        :disabled="disabled"
        :round="round"
        :size="size"
        @click="(ev) => emit('click', ev)"
        type="primary"
      >
        <slot></slot>
      </n-button>
      <n-popover trigger="click" placement="bottom-end">
        <template #trigger>
          <n-button :disabled="disabled" :round="round" :size="size">
            <template #icon>
              <n-icon>
                <solar-settings-linear />
              </n-icon>
            </template>
          </n-button>
        </template>
        <slot name="popover"></slot>
      </n-popover>
    </n-button-group>
  </div>
</template>

<style scoped lang="scss">
.optional-button {
  width: 100%;

  .button-group {
    width: 100%;

    > button:first-of-type,
    > button:last-of-type {
      transition: width 0.3s;
    }

    > button:first-of-type {
      width: 85%;

      &:hover {
        width: 88%;
      }
    }

    > button:last-of-type {
      width: 15%;

      &:hover {
        width: 20%;
      }
    }

    &:has(> button:last-of-type:hover) > button:first-of-type {
      width: 80%;
    }

    &:has(> button:first-of-type:hover) > button:last-of-type {
      width: 12%;
    }
  }
}
</style>
