<template>
    <md-snackbar :md-active="show">{{ message }}<md-button @click="dismissNotification()" class="md-primary"><md-icon>close</md-icon></md-button></md-snackbar>
</template>

<script>
import { mapActions } from 'vuex'
export default {
  name: 'user-notifications',
  computed: {
    show () {
      return this.$store.state.Application.notification.show
    },
    message () {
      return this.$store.state.Application.notification.message
    }
  },
  methods: {
    ...mapActions({
      dismissNotification: 'DISMISS_NOTIFICATION'
    })
  }
}
</script>

<style>
</style>
