<script lang="ts" setup>
defineProps<{ model: AmazonDetailItem }>();
</script>

<template>
  <div class="detail-description">
    <n-descriptions label-placement="left" bordered :column="4" label-style="min-width: 100px">
      <n-descriptions-item label="ASIN">
        {{ model.asin }}
      </n-descriptions-item>
      <n-descriptions-item label="获取日期">
        {{ model.timestamp }}
      </n-descriptions-item>
      <n-descriptions-item label="评价">
        {{ model.rating || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="评论数">
        {{ model.ratingCount || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="分类信息" :span="2">
        {{ model.categories || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="销量信息">
        {{ model.boughtInfo || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="上架日期">
        {{ model.availableDate || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="大类">
        {{ model.category1?.name || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="排名">
        {{ model.category1?.rank || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="小类">
        {{ model.category2?.name || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="排名">
        {{ model.category2?.rank || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="图片链接" :span="4">
        <ul>
          <li v-for="link in model.imageUrls">
            <image-link :url="link" />
          </li>
        </ul>
      </n-descriptions-item>
      <n-descriptions-item v-if="model.abouts && model.abouts.length" label="About" :span="4">
        <ul>
          <li v-for="(about, idx) in model.abouts" :key="idx">{{ about }}</li>
        </ul>
      </n-descriptions-item>
      <n-descriptions-item label="A+" :span="4">
        <ul v-if="model.aplus">
          <li><image-link :url="model.aplus" /></li>
        </ul>
        <template v-else>-</template>
      </n-descriptions-item>
      <n-descriptions-item label="发货快递">
        {{ model.shipFrom || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="卖家">
        {{ model.soldBy || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="品牌名称">
        {{ model.brand || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="口味/风味">
        {{ model.flavor || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="单位数量">
        {{ model.unitCount || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="形态/剂型">
        {{ model.itemForm || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="商品尺寸" :span="2">
        {{ model.productDimensions || '-' }}
      </n-descriptions-item>
    </n-descriptions>
  </div>
</template>

<style scoped lang="scss">
.review-item-footer {
  display: flex;
  flex-direction: row-reverse;
}
</style>
